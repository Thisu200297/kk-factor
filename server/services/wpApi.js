const { USER_AGENT } = require('./feeds');

/**
 * A reader for the WordPress REST API, used for Greek City Times.
 *
 * WHY THIS EXISTS ALONGSIDE THE RSS READER
 *
 * Their RSS feed is what you use when you have no relationship with a
 * publisher: it hands over the fifteen most recent stories and nothing else.
 * No pictures at all — no <media:content>, no <enclosure>, and only the
 * occasional inline <img> — which is why the feed importer has to fetch each
 * article page just to read its og:image. No sections either, so every
 * imported story lands in the same bucket.
 *
 * Once a publisher has said yes in writing, their WordPress install already
 * offers something far better at /wp-json/wp/v2/posts, with no key and no
 * quota:
 *
 *   - the whole article body, in content.rendered
 *   - the lead photo as a real URL, in several sizes, no page fetch needed
 *   - the sections and tags they filed it under, so ours can mirror theirs
 *   - the author's name
 *   - modified_gmt, so a correction they publish reaches us too
 *   - a hundred posts a page, and pages going back years
 *
 * The post ids match: RSS <guid> and the API's guid.rendered are both
 * `https://site/?p=<id>`, so a story already imported from the feed is
 * recognised and updated rather than inserted a second time. Switching
 * sources costs nothing and duplicates nothing.
 *
 * Nothing here decides whether the body may be *stored*. That stays with
 * NEWS_FULL_TEXT, which is a question about permission, not about plumbing.
 */

/**
 * How long to wait, scaled to how much was asked for.
 *
 * An embedded post is heavy — the featured image alone carries a dozen
 * renditions, and a page of thirty runs to about six megabytes. A flat twenty
 * seconds is ample for a routine refresh and nowhere near enough for a
 * backfill, and the failure looks like the API being down rather than the
 * request being large.
 */
const BASE_TIMEOUT_MS = 20000;
const PER_POST_TIMEOUT_MS = 800;
const MAX_TIMEOUT_MS = 90000;

const timeoutFor = (count = 1) =>
  Math.min(MAX_TIMEOUT_MS, BASE_TIMEOUT_MS + count * PER_POST_TIMEOUT_MS);

/**
 * Only the fields this importer reads. `_links` has to stay: WordPress builds
 * the embedded objects from it, so dropping it drops the photo, the author
 * and the sections with it.
 */
const FIELDS = [
  'id', 'guid', 'link', 'date_gmt', 'modified_gmt',
  'title', 'content', 'excerpt', '_links', '_embedded',
].join(',');

/** Only the relations this importer reads, rather than everything WP can embed. */
const EMBED = 'wp:featuredmedia,author,wp:term';

/**
 * Turns whatever the site is configured with — a feed URL, a bare host, an
 * API root — into the posts endpoint.
 *
 *   https://greekcitytimes.com/feed/  ->  https://greekcitytimes.com/wp-json/wp/v2
 *   greekcitytimes.com                ->  https://greekcitytimes.com/wp-json/wp/v2
 */
function apiRootFrom(input) {
  if (!input) return null;
  let raw = String(input).trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  // Already an API root, however much of the path they gave us.
  const wp = url.pathname.indexOf('/wp-json');
  if (wp !== -1) return `${url.origin}/wp-json/wp/v2`;

  return `${url.origin}/wp-json/wp/v2`;
}

async function getJson(url, timeoutMs = BASE_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The lead photo.
 *
 * WordPress renders the same image at several widths and lists them under
 * media_details.sizes. The full-size original is often a 3000px press photo
 * weighing several megabytes, and it is going into a card. Prefer a rendition
 * wide enough to stay sharp on a retina card and no wider, and fall back to
 * the original only when the site has no renditions.
 */
function featuredImage(post) {
  const media = post?._embedded?.['wp:featuredmedia']?.[0];
  if (!media || media.code) return null; // `code` means an error stub

  const sizes = media.media_details?.sizes || {};
  for (const name of ['large', 'medium_large', 'full', 'medium']) {
    const url = sizes[name]?.source_url;
    if (url) return url;
  }
  return media.source_url || null;
}

/** Their section names, so ours can be mapped from them. Tags are ignored. */
function categoryNames(post) {
  const groups = post?._embedded?.['wp:term'] || [];
  const categories = groups[0] || [];
  return categories
    .filter((term) => term && term.taxonomy === 'category' && term.name)
    .map((term) => String(term.name));
}

function authorName(post) {
  const author = post?._embedded?.author?.[0];
  if (!author || author.code) return null;
  return author.name ? String(author.name) : null;
}

/**
 * One post, in the same shape the RSS importer already works with, so the
 * importer does not care which source it came from.
 */
function normalise(post) {
  return {
    guid: post?.guid?.rendered || (post?.id ? `?p=${post.id}` : null),
    postId: post?.id ?? null,
    title: post?.title?.rendered || '',
    link: post?.link || '',
    html: post?.content?.rendered || '',
    excerptHtml: post?.excerpt?.rendered || '',
    image: featuredImage(post),
    author: authorName(post),
    categories: categoryNames(post),
    publishedAt: post?.date_gmt ? new Date(`${post.date_gmt}Z`) : null,
    modifiedAt: post?.modified_gmt ? new Date(`${post.modified_gmt}Z`) : null,
  };
}

/**
 * Fetches one page of posts.
 *
 * `categories` narrows to particular sections — Greek City Times publishes a
 * great deal that a Melbourne Greek radio audience has no use for, and taking
 * everything would bury the stories that matter under wire copy about Turkey
 * and the United States. Empty means everything.
 */
async function fetchPosts({
  apiRoot,
  perPage = 20,
  page = 1,
  categories = [],
  after = null,
} = {}) {
  if (!apiRoot) throw new Error('No WordPress API root configured');

  const params = new URLSearchParams({
    per_page: String(Math.min(Math.max(perPage, 1), 100)),
    page: String(Math.max(page, 1)),
    orderby: 'date',
    order: 'desc',
    status: 'publish',
    _embed: EMBED,
    _fields: FIELDS,
  });

  if (categories.length) params.set('categories', categories.join(','));
  if (after) params.set('after', new Date(after).toISOString());

  const data = await getJson(`${apiRoot}/posts?${params}`, timeoutFor(perPage));

  // A page past the end answers with an error object rather than an empty
  // array, which is a normal thing to walk into while paging and not a fault.
  if (!Array.isArray(data)) {
    if (data?.code === 'rest_post_invalid_page_number') return [];
    throw new Error(data?.message || 'Unexpected response from the WordPress API');
  }

  return data.map(normalise);
}

/** The site's own section list, for choosing which ones to take. */
async function fetchCategories(apiRoot) {
  if (!apiRoot) throw new Error('No WordPress API root configured');
  const data = await getJson(
    `${apiRoot}/categories?per_page=100&orderby=count&order=desc&_fields=id,name,slug,count`,
    BASE_TIMEOUT_MS
  );
  if (!Array.isArray(data)) return [];
  return data;
}

/** Is the API actually there? Used to decide whether to fall back to RSS. */
async function isReachable(apiRoot) {
  if (!apiRoot) return false;
  try {
    const data = await getJson(`${apiRoot}/posts?per_page=1&_fields=id`, 10000);
    return Array.isArray(data);
  } catch {
    return false;
  }
}

module.exports = {
  apiRootFrom,
  fetchPosts,
  fetchCategories,
  isReachable,
  featuredImage,
  categoryNames,
  normalise,
};

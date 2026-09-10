const config = require('../config/env');
const { Article, Category, User } = require('../models');
const { slugify, uniqueSlug } = require('../utils/slugify');
const { sanitizeRichText, sanitizePlain } = require('../utils/sanitize');
const { fetchFeed, firstImage, ogImage, toPlainText } = require('./feeds');
const wpApi = require('./wpApi');

/**
 * Imports the Greek City Times newsroom.
 *
 * TWO SOURCES, AND THE BETTER ONE IS PREFERRED
 *
 *   The WordPress API at /wp-json/wp/v2/posts is used when it answers. It
 *   carries the lead photo as a real URL, the sections the story was filed
 *   under, the author, the modification time, and up to a hundred posts a
 *   page going back years.
 *
 *   The RSS feed is the fallback, for when that API is turned off or the
 *   publisher changes. It carries the fifteen most recent stories, no
 *   pictures whatsoever and no sections, so the importer has to fetch each
 *   article page for its og:image and file everything under one heading.
 *
 * Both identify a story the same way — WordPress writes `?p=<id>` into both
 * the feed's <guid> and the API's guid.rendered — so the two sources agree
 * about what is already stored, and switching between them duplicates
 * nothing.
 *
 * TWO MODES, AND THE DIFFERENCE IS LEGAL RATHER THAN TECHNICAL
 *
 *   linkOut stores the headline, the photo and a short excerpt, and sends the
 *   reader to greekcitytimes.com to finish it. That is ordinary aggregation
 *   and needs nobody's permission.
 *
 *   fullText stores the whole article body. Both sources hand the body over
 *   freely, and that is not a licence to republish it, so this stays off
 *   until the publisher has agreed in writing. NEWS_FULL_TEXT is the switch.
 *
 * Note that permission to republish an article's *text* is not automatically
 * permission to republish its *photographs*: newsrooms routinely run agency
 * pictures they license for their own site alone. Worth settling separately.
 */

/**
 * Their sections on the left, ours on the right.
 *
 * Greek City Times files under a hundred categories. These are the ones that
 * actually carry volume, mapped onto the handful of headings this site has.
 * Anything unrecognised falls through to Greek News.
 */
const CATEGORY_MAP = {
  // Greece itself
  'greek news': 'Greek News',
  greece: 'Greek News',
  'current affairs': 'Greek News',
  'latest news': 'Greek News',
  politics: 'Greek News',
  religion: 'Greek News',
  orthodoxy: 'Greek News',
  history: 'Greek News',
  community: 'Greek News',

  'ancient greece': 'Greek News',
  archaeology: 'Greek News',
  cyprus: 'Greek News',

  // The diaspora, which is who this station broadcasts to
  'greek australian news': 'Greek Australian',
  'greek australian': 'Greek Australian',
  australia: 'Greek Australian',
  diaspora: 'Greek Australian',
  melbourne: 'Greek Australian',
  sydney: 'Greek Australian',

  // Culture and the lighter end
  'greek culture': 'Entertainment',
  'greek lifestyle': 'Entertainment',
  lifestyle: 'Entertainment',
  entertainment: 'Entertainment',
  culture: 'Entertainment',
  music: 'Entertainment',
  arts: 'Entertainment',
  art: 'Entertainment',
  food: 'Entertainment',
  film: 'Entertainment',
  people: 'Entertainment',
  society: 'Entertainment',
  celebrity: 'Entertainment',
  events: 'Entertainment',
  travel: 'Entertainment',
  'travel news': 'Entertainment',
  'greece travel': 'Entertainment',

  sport: 'Sports',
  sports: 'Sports',

  // Wire copy about everywhere else
  'world news': 'Politics',
  world: 'Politics',
  turkey: 'Politics',
  usa: 'Politics',
  uk: 'Politics',
  eu: 'Politics',
  business: 'Politics',
  finance: 'Politics',

  technology: 'Tech',
  tech: 'Tech',
};

const FALLBACK_CATEGORY = 'Greek News';

/** Space out the page requests the RSS path makes to fill in missing photos. */
const OG_LOOKUP_GAP_MS = 400;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Finds or creates one of our categories by name. */
async function ensureCategory(name, cache) {
  if (cache.has(name)) return cache.get(name);

  const slug = slugify(name);
  const category = await Category.findOneAndUpdate(
    { slug },
    { $setOnInsert: { name, slug, description: null, display_order: 50 } },
    { returnDocument: 'after', upsert: true }
  );
  cache.set(name, category);
  return category;
}

/** Picks our category from whatever sections the publisher tagged the item with. */
function mapCategory(sourceCategories = []) {
  for (const raw of sourceCategories) {
    const hit = CATEGORY_MAP[String(raw).trim().toLowerCase()];
    if (hit) return hit;
  }
  return FALLBACK_CATEGORY;
}

/**
 * WordPress appends "The post ... appeared first on ..." to every excerpt it
 * syndicates. We render our own attribution and link, so it is noise.
 *
 * Only the final paragraph is considered, and only if it does not span any
 * other paragraph. The obvious pattern —
 *
 *     /<p>\s*The post[\s\S]*?appeared first on[\s\S]*?<\/p>\s*$/
 *
 * — looks equivalent and is not: anchored to the end of the string, it starts
 * at the FIRST paragraph beginning "The post" and runs to the LAST `</p>` in
 * the document. An article whose own prose happens to contain that phrase
 * loses everything from there to the end. Harmless while we only stored a
 * two-line excerpt; not harmless now that full articles are stored.
 */
function stripSyndicationTrailer(html) {
  const source = String(html || '');

  const lastParagraph = /<p\b[^>]*>((?:(?!<\/?p\b)[\s\S])*)<\/p>\s*$/i.exec(source);
  if (!lastParagraph) return source;

  if (!/The post[\s\S]*appeared first on/i.test(lastParagraph[1])) return source;

  return source.slice(0, lastParagraph.index);
}

/**
 * The publisher's own furniture, removed before the article is stored.
 *
 * A newsroom's article body is not only the article. Greek City Times inject
 * ad slots into theirs: a wrapper holding a consent-gated <script> and a
 * little label reading "Advertising1". The sanitiser drops the script, as it
 * should — and leaves the label sitting in the middle of the prose, where it
 * reads as though we wrote it.
 *
 * Everything here is non-greedy and stops at the first closing tag, so the
 * worst case is a fragment of markup left behind rather than an article
 * silently truncated. Wrong in the harmless direction.
 */
const PUBLISHER_CHROME = [
  // The ad label itself.
  /<div[^>]*class="[^"]*adlabel[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
  // Blocks a publisher appends to every article: related posts, newsletter
  // sign-ups, "read more from us".
  /<div[^>]*class="[^"]*(?:after-post|related-post|newsletter|subscribe-box)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
  // A bare "Advertisement" paragraph, which some themes use instead.
  /<p[^>]*>\s*Advertisement\s*\d*\s*<\/p>/gi,
];

/** Elements the sanitiser leaves behind once their contents have gone. */
const EMPTY_ELEMENT = /<(div|p|span|figure)\b[^>]*>\s*<\/\1>/gi;

function stripPublisherChrome(html) {
  let out = String(html || '');
  for (const pattern of PUBLISHER_CHROME) out = out.replace(pattern, '');

  // Twice, because removing an inner element can empty its parent.
  out = out.replace(EMPTY_ELEMENT, '').replace(EMPTY_ELEMENT, '');
  return out;
}

/**
 * A summary that ends on a word.
 *
 * Slicing to a fixed length lands mid-word about five times in six, and
 * "...was initially treated at a pr…" is the sort of thing a reader notices
 * before they notice the headline. Backing up to the last space fixes it,
 * unless that would throw away most of the summary.
 */
function makeExcerpt(plain, max = 300) {
  const text = String(plain || '').trim();
  if (text.length <= max) return text;

  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  const kept = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;

  return `${kept.replace(/[\s,;:.\u2013\u2014-]+$/, '')}…`;
}

/** The article body we are willing to store, given the permission we have. */
function bodyFor(item, fullText) {
  if (fullText && item.html) {
    return sanitizeRichText(stripPublisherChrome(item.html));
  }

  const source = item.excerptHtml || item.html || '';
  const trimmed = stripSyndicationTrailer(source);
  return sanitizeRichText(stripPublisherChrome(trimmed || source));
}

/* ------------------------------------------------------------------------ *
 * Reading the two sources into one shape
 * ------------------------------------------------------------------------ */

/** An RSS item, in the shape wpApi.normalise produces. */
function fromFeedItem(item) {
  return {
    guid: String(item.guid || item.id || item.link || '').trim(),
    postId: null,
    title: item.title || '',
    link: item.link || '',
    html: item.contentEncoded || item.content || '',
    excerptHtml: String(item.contentSnippet || item.content || item.description || ''),
    image: firstImage(item.contentEncoded) || firstImage(item.content) || null,
    author: item.creator || null,
    categories: item.categories || [],
    publishedAt: item.isoDate ? new Date(item.isoDate) : null,
    modifiedAt: null,
  };
}

/**
 * Collects the stories to import, from the API where possible.
 *
 * `pages` is what makes a back catalogue possible: one page is the routine
 * refresh, ten is a one-off backfill of a thousand articles. It only applies
 * to the API — RSS has exactly one page and that is the whole of it.
 */
async function loadItems({ perPage, pages, categoryIds }) {
  const apiRoot = config.news.apiUrl || wpApi.apiRootFrom(config.news.feedUrl);

  if (config.news.useApi && apiRoot) {
    try {
      const collected = [];
      for (let page = 1; page <= Math.max(1, pages); page += 1) {
        const batch = await wpApi.fetchPosts({
          apiRoot,
          perPage,
          page,
          categories: categoryIds,
        });
        collected.push(...batch);
        if (batch.length < perPage) break; // ran off the end
      }
      return { items: collected, via: 'api', apiRoot };
    } catch (error) {
      // Not fatal. The feed is still there, and a newsroom that has switched
      // its API off should not take the news panel down with it.
      // eslint-disable-next-line no-console
      console.warn(`[news] API unavailable (${error.message}); falling back to RSS`);
    }
  }

  if (!config.news.feedUrl) return { items: [], via: 'none', apiRoot };

  const feed = await fetchFeed(config.news.feedUrl);
  return {
    items: (feed.items || []).slice(0, perPage).map(fromFeedItem),
    via: 'rss',
    feedTitle: feed.title,
    apiRoot,
  };
}

/* ------------------------------------------------------------------------ *
 * The import
 * ------------------------------------------------------------------------ */

/**
 * Runs one import pass. Idempotent: a story already stored under its guid is
 * updated in place rather than inserted again, so this can run as often as
 * you like and a correction the publisher makes reaches the site too.
 */
async function importNews({ limit, pages, categoryIds } = {}) {
  const { sourceName, fullText } = config.news;

  const perPage = limit || config.news.perPage;
  const wantPages = pages || config.news.pages;
  const wantCategories = categoryIds || config.news.categoryIds;

  const author = await User.findOne({ role: 'admin' }).sort({ created_at: 1 });
  if (!author) {
    return {
      skipped: true,
      reason: 'No admin account to attribute imports to',
      imported: 0,
      updated: 0,
    };
  }

  const { items, via, feedTitle } = await loadItems({
    perPage,
    pages: wantPages,
    categoryIds: wantCategories,
  });

  if (via === 'none') {
    return {
      skipped: true,
      reason: 'Neither NEWS_API_URL nor NEWS_FEED_URL is set',
      imported: 0,
      updated: 0,
    };
  }

  const cache = new Map();
  let imported = 0;
  let updated = 0;
  let failed = 0;
  let photosFetched = 0;

  for (const item of items) {
    try {
      if (!item.guid || !item.title || !item.link) continue;

      const existing = await Article.findOne({ external_guid: item.guid });

      const content = bodyFor(item, fullText);
      const plain = toPlainText(content);

      /**
       * The API hands the photo over directly. Only the feed leaves us
       * guessing, and then only for a story we have no picture for yet — so a
       * page is fetched at most once per story, ever.
       */
      let image = item.image;
      if (!image && via === 'rss' && (!existing || !existing.image_url)) {
        image = await ogImage(item.link);
        if (image) photosFetched += 1;
        await sleep(OG_LOOKUP_GAP_MS);
      }

      const category = await ensureCategory(mapCategory(item.categories), cache);

      const fields = {
        title: sanitizePlain(item.title).slice(0, 255),
        content,
        excerpt: makeExcerpt(plain),
        category_id: category._id,
        author_id: author._id,
        status: 'published',
        published_at: item.publishedAt || new Date(),
        is_external: true,
        is_full_text: Boolean(fullText && item.html),
        source_name: sourceName,
        source_url: item.link,
        source_author: item.author ? sanitizePlain(item.author) : null,
      };

      if (existing) {
        // Headlines and photos do get corrected after publication. The slug is
        // left alone on purpose: it is already in links and search results.
        Object.assign(existing, fields);
        if (image) existing.image_url = image;
        await existing.save();
        updated += 1;
      } else {
        await Article.create({
          ...fields,
          image_url: image,
          slug: await uniqueSlug(Article, fields.title),
          external_guid: item.guid,
        });
        imported += 1;
      }
    } catch (error) {
      // One malformed story must not abandon the rest of the newsroom.
      failed += 1;
      // eslint-disable-next-line no-console
      console.error(`[news] Skipped "${item?.title || 'untitled'}": ${error.message}`);
    }
  }

  return {
    skipped: false,
    source: feedTitle || sourceName,
    via,
    seen: items.length,
    imported,
    updated,
    failed,
    photosFetched,
    mode: fullText ? 'fullText' : 'linkOut',
  };
}

module.exports = {
  importNews,
  CATEGORY_MAP,
  FALLBACK_CATEGORY,
  mapCategory,
  stripSyndicationTrailer,
  stripPublisherChrome,
  makeExcerpt,
  bodyFor,
  fromFeedItem,
};

const Parser = require('rss-parser');

/**
 * Shared feed reader for the two syndication sources this site consumes:
 * Greek City Times (WordPress RSS 2.0) and the YouTube channel (Atom).
 *
 * One parser handles both formats; the only thing that differs is which
 * namespaced elements each one carries, so every namespaced field either
 * source might use is declared here and the importers pick out what they need.
 */

/**
 * Both hosts sit behind bot protection that refuses requests with no user
 * agent — greekcitytimes.com answers those with a 402. Identifying the site
 * honestly, with a contact URL, is what gets let through, and it is also what
 * a publisher would want to see in their logs.
 */
const USER_AGENT = 'TheKKFactor/1.0 (+https://thekkfactor.com.au; feed reader)';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8',
  },
  customFields: {
    item: [
      // WordPress: the whole article body, as opposed to `description`,
      // which carries only the excerpt.
      ['content:encoded', 'contentEncoded'],
      // YouTube Atom.
      ['yt:videoId', 'youtubeId'],
      ['media:group', 'mediaGroup'],
    ],
  },
});

/** Reads and parses a feed. Throws with a message worth putting in a log. */
async function fetchFeed(url) {
  try {
    return await parser.parseURL(url);
  } catch (error) {
    throw new Error(`Could not read the feed at ${url}: ${error.message}`);
  }
}

/**
 * rss-parser represents an XML element that has both attributes and children
 * as an object with the attributes under `$`. These two helpers dig a value
 * out of that shape without every call site having to know it, and without
 * throwing when a publisher simply omits the element.
 */
function attr(node, name) {
  if (!node) return null;
  const first = Array.isArray(node) ? node[0] : node;
  return first?.$?.[name] ?? null;
}

function text(node) {
  if (node == null) return null;
  const first = Array.isArray(node) ? node[0] : node;
  if (typeof first === 'string') return first;
  return first?._ ?? null;
}

/** First <img src> in a block of HTML — WordPress puts the lead photo there. */
function firstImage(html) {
  if (!html) return null;
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return match ? match[1] : null;
}

/**
 * The article's social-share image, read from the page itself.
 *
 * Needed because this particular feed carries no images at all: no
 * <media:content>, no <enclosure>, and only four of fifteen items happen to
 * have a picture inside the body HTML. Every one of those pages does carry an
 * og:image — the tag Facebook and every link preview reads — so one request
 * per story fills the gap.
 *
 * Deliberately cheap and deliberately quiet: only ever called for a story with
 * no picture yet, only once per story (the result is stored), capped at eight
 * seconds, and every failure returns null rather than interrupting an import.
 */
async function ogImage(pageUrl) {
  if (!pageUrl) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(pageUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
    });
    clearTimeout(timer);

    if (!response.ok) return null;

    // The tag lives in <head>; there is no reason to scan a whole article.
    const html = (await response.text()).slice(0, 131072);

    const match =
      /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i.exec(html) ||
      /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i.exec(html) ||
      /<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i.exec(html);

    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/** Collapses HTML to plain text, for excerpts and length checks. */
function toPlainText(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#8217;|&#039;|&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { fetchFeed, attr, text, firstImage, ogImage, toPlainText, USER_AGENT };

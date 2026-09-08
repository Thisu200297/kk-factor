const config = require('../config/env');
const { Article, Category, User } = require('../models');
const { slugify, uniqueSlug } = require('../utils/slugify');
const { sanitizeRichText, sanitizePlain } = require('../utils/sanitize');
const { fetchFeed, firstImage, ogImage, toPlainText } = require('./feeds');

/**
 * Imports the Greek City Times feed.
 *
 * TWO MODES, and the difference is legal rather than technical.
 *
 *   linkOut (the default) stores the headline, the photo and the feed's own
 *   short excerpt, and sends the reader to greekcitytimes.com to finish it.
 *   That is ordinary aggregation and needs no permission.
 *
 *   fullText stores the whole article body, which the WordPress feed does hand
 *   over in <content:encoded>. A feed exposing the text is NOT a licence to
 *   republish it, so this mode stays off until Greek City Times have agreed in
 *   writing. Flip NEWS_FULL_TEXT in server/.env once they have.
 */

/** Their section names on the left, ours on the right. */
const CATEGORY_MAP = {
  'greek news': 'Greek News',
  politics: 'Politics',
  world: 'Politics',
  sport: 'Sports',
  sports: 'Sports',
  entertainment: 'Entertainment',
  culture: 'Entertainment',
  music: 'Entertainment',
  food: 'Entertainment',
  travel: 'Entertainment',
  religion: 'Greek News',
  orthodoxy: 'Greek News',
  community: 'Greek News',
  business: 'Politics',
  technology: 'Tech',
  tech: 'Tech',
};

const FALLBACK_CATEGORY = 'Greek News';

/** Space out the page requests that fill in missing photos. */
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
function mapCategory(feedCategories = []) {
  for (const raw of feedCategories) {
    const hit = CATEGORY_MAP[String(raw).trim().toLowerCase()];
    if (hit) return hit;
  }
  return FALLBACK_CATEGORY;
}

/**
 * The article body we are willing to store.
 *
 * In linkOut mode this is deliberately short: their excerpt, with the
 * "The post ... appeared first on ..." trailer WordPress appends stripped out,
 * since we render our own attribution and link.
 */
function bodyFor(item, fullText) {
  if (fullText && item.contentEncoded) return sanitizeRichText(item.contentEncoded);

  const excerpt = String(item.contentSnippet || item.content || item.description || '');
  const trimmed = excerpt.replace(/<p>\s*The post[\s\S]*?appeared first on[\s\S]*?<\/p>\s*$/i, '');
  return sanitizeRichText(trimmed || excerpt);
}

/**
 * Runs one import pass. Idempotent: an item already stored under its feed guid
 * is updated in place rather than inserted again, so this can run as often as
 * you like without ever duplicating a story.
 */
async function importNews({ limit = 30 } = {}) {
  const { feedUrl, sourceName, fullText } = config.news;

  if (!feedUrl) {
    return { skipped: true, reason: 'NEWS_FEED_URL is not set', imported: 0, updated: 0 };
  }

  const author = await User.findOne({ role: 'admin' }).sort({ created_at: 1 });
  if (!author) {
    return { skipped: true, reason: 'No admin account to attribute imports to', imported: 0, updated: 0 };
  }

  const feed = await fetchFeed(feedUrl);
  const items = (feed.items || []).slice(0, limit);

  const cache = new Map();
  let imported = 0;
  let updated = 0;
  let failed = 0;
  let photosFetched = 0;

  for (const item of items) {
    try {
      const guid = String(item.guid || item.id || item.link || '').trim();
      if (!guid || !item.title || !item.link) continue;

      const existing = await Article.findOne({ external_guid: guid });

      const content = bodyFor(item, fullText);
      const plain = toPlainText(content);

      /**
       * This feed almost never carries a picture, so fall back to the article
       * page's og:image — but only when we still have nothing, so a story is
       * fetched at most once and a re-import costs no extra requests.
       */
      let image = firstImage(item.contentEncoded) || firstImage(item.content) || null;
      if (!image && (!existing || !existing.image_url)) {
        image = await ogImage(item.link);
        if (image) photosFetched += 1;
        await sleep(OG_LOOKUP_GAP_MS);
      }

      const category = await ensureCategory(mapCategory(item.categories), cache);

      const fields = {
        title: sanitizePlain(item.title).slice(0, 255),
        content,
        excerpt: plain.slice(0, 300) + (plain.length > 300 ? '…' : ''),
        category_id: category._id,
        author_id: author._id,
        status: 'published',
        published_at: item.isoDate ? new Date(item.isoDate) : new Date(),
        is_external: true,
        source_name: sourceName,
        source_url: item.link,
        source_author: item.creator ? sanitizePlain(item.creator) : null,
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
          external_guid: guid,
        });
        imported += 1;
      }
    } catch (error) {
      // One malformed item must not abandon the rest of the feed.
      failed += 1;
      // eslint-disable-next-line no-console
      console.error(`[news] Skipped "${item?.title || 'untitled'}": ${error.message}`);
    }
  }

  return {
    skipped: false,
    source: feed.title || sourceName,
    seen: items.length,
    imported,
    updated,
    failed,
    photosFetched,
    mode: fullText ? 'fullText' : 'linkOut',
  };
}

module.exports = { importNews, CATEGORY_MAP, FALLBACK_CATEGORY };

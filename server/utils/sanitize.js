const sanitizeHtml = require('sanitize-html');

/**
 * Article bodies come from a rich-text editor, so a subset of HTML must
 * survive. Everything outside the allow-list (script, iframe, on* handlers,
 * javascript: URLs) is stripped.
 */
const ARTICLE_OPTIONS = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr', 'blockquote', 'pre', 'code',
    'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
    'ul', 'ol', 'li',
    'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'data'],
  transformTags: {
    // Never let user content open a tab with window.opener access.
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

/**
 * Typographic entities that should read as characters, never as their escape.
 *
 * A headline arriving from a feed as "Greek Community &amp; What's Ahead" is
 * plain text with an ampersand in it — leaving the entity encoded means the
 * reader sees the literal "&amp;" on the page, because React escapes the
 * string again on the way out. Feed titles are full of these.
 *
 * `&lt;` and `&gt;` are DELIBERATELY absent. Decoding those would turn a
 * neutralised "<script>" back into something that only stays harmless as long
 * as every consumer renders it as text — a promise this helper cannot make on
 * behalf of code that has not been written yet.
 */
const ENTITIES = {
  '&amp;': '&',
  '&#38;': '&',
  '&apos;': "'",
  '&#039;': "'",
  '&#39;': "'",
  '&lsquo;': '‘',
  '&rsquo;': '’',
  '&#8216;': '‘',
  '&#8217;': '’',
  '&quot;': '"',
  '&#34;': '"',
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&#8220;': '“',
  '&#8221;': '”',
  '&ndash;': '–',
  '&mdash;': '—',
  '&#8211;': '–',
  '&#8212;': '—',
  '&hellip;': '…',
  '&#8230;': '…',
  '&nbsp;': ' ',
  '&#160;': ' ',
};

const ENTITY_PATTERN = new RegExp(Object.keys(ENTITIES).join('|'), 'gi');

/** Turns the entities above back into the characters they stand for. */
function decodeTextEntities(value) {
  if (typeof value !== 'string') return value;
  return value.replace(ENTITY_PATTERN, (match) => ENTITIES[match.toLowerCase()] ?? match);
}

/** Strips ALL markup — for titles, names, excerpts and other plain fields. */
function sanitizePlain(value) {
  if (typeof value !== 'string') return value;
  const stripped = sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
  return decodeTextEntities(stripped).trim();
}

/** Cleans rich-text while preserving safe formatting. */
function sanitizeRichText(value) {
  if (typeof value !== 'string') return value;
  return sanitizeHtml(value, ARTICLE_OPTIONS);
}

module.exports = { sanitizePlain, sanitizeRichText, decodeTextEntities };

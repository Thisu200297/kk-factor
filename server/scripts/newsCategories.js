/**
 * Lists the sections the news publisher files stories under, with how many
 * they have in each, so NEWS_CATEGORY_IDS can be chosen from real numbers
 * rather than guesswork.
 *
 *   npm run news:categories
 *
 * Greek City Times publishes about a hundred sections and the great majority
 * of the volume is wire copy — World News, Turkey, USA — which would bury the
 * Greek and Greek-Australian stories this station's listeners came for. This
 * is how you see that before deciding.
 */
const config = require('../config/env');
const wpApi = require('../services/wpApi');

/** A sensible starting point for a Greek community station in Melbourne. */
const SUGGESTED = [
  // Greece
  'greek news',
  'greece',
  'greece travel',
  'cyprus',
  'religion',
  'orthodoxy',
  'history',
  'ancient greece',
  // The diaspora, which is who this station broadcasts to
  'greek australian news',
  'diaspora',
  'melbourne',
  'sydney',
  // Culture and the lighter end
  'greek culture',
  'greek lifestyle',
  'entertainment',
  'music',
  'arts',
  'film',
  'food',
  'people',
  'events',
  'sports',
];

(async () => {
  const apiRoot = config.news.apiUrl || wpApi.apiRootFrom(config.news.feedUrl);

  if (!apiRoot) {
    console.error('[news] Set NEWS_FEED_URL or NEWS_API_URL first.');
    process.exit(1);
  }

  console.log(`[news] Reading ${apiRoot}/categories\n`);

  let categories;
  try {
    categories = await wpApi.fetchCategories(apiRoot);
  } catch (error) {
    console.error(`[news] Could not read the category list: ${error.message}`);
    process.exit(1);
  }

  const withPosts = categories.filter((c) => c.count > 0);

  console.log('   id       posts  section');
  console.log('   -------  -----  ---------------------------------------------');
  for (const category of withPosts) {
    const mark = SUGGESTED.includes(category.name.toLowerCase()) ? '*' : ' ';
    console.log(
      ` ${mark} ${String(category.id).padEnd(7)}  ${String(category.count).padStart(5)}  ${category.name}`
    );
  }

  const suggested = withPosts.filter((c) => SUGGESTED.includes(c.name.toLowerCase()));
  const total = suggested.reduce((sum, c) => sum + c.count, 0);

  console.log(`\n[news] ${withPosts.length} sections carry stories.`);
  console.log('[news] * marks a suggested starting point for this audience');
  console.log(`[news]   — ${suggested.length} sections, ${total.toLocaleString()} stories.\n`);
  console.log('[news] To take only those, put this in the environment:\n');
  console.log(`NEWS_CATEGORY_IDS=${suggested.map((c) => c.id).join(',')}\n`);
  console.log('[news] Leave it unset to take everything they publish.\n');

  process.exit(0);
})();

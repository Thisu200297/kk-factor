/**
 * Seeds a working dataset: an admin account, the five categories from the
 * brief, sample articles, radio stations and demo tracks/playlists.
 *
 *   npm run db:seed            -> insert only what is missing (idempotent)
 *   npm run db:seed -- --fresh -> drop everything and rebuild
 */
const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const {
  connectDatabase, disconnectDatabase, mongoose,
  User, Category, Article, Track, Playlist, RadioStream,
} = require('../models');
const { slugify } = require('../utils/slugify');
const { generateDemoTracks } = require('./makeDemoAudio');

const CATEGORIES = [
  { name: 'Latest', description: 'Everything as it happens, newest first.', display_order: 0 },
  { name: 'Politics', description: 'Parliament, policy and the people shaping them.', display_order: 1 },
  { name: 'Sports', description: 'Results, transfers and long-form sport writing.', display_order: 2 },
  { name: 'Tech', description: 'Product launches, platforms and the business of software.', display_order: 3 },
  { name: 'Entertainment', description: 'Music, screen, culture and the KK Factor studio.', display_order: 4 },
];

/**
 * Development placeholders only, and seeded OFF AIR (is_live: false) so a listener
 * never sees them by accident. SomaFM publishes these Icecast endpoints publicly,
 * but they are NOT licensed to this station and must not be broadcast under KK
 * Factor branding. Replace with the station's own licensed feed before launch.
 */
const STREAMS = [
  {
    name: 'Sample stream 1 (SomaFM) - replace before launch',
    stream_url: 'https://ice1.somafm.com/groovesalad-128-mp3',
    genre: 'Placeholder',
    description:
      'PLACEHOLDER ONLY. This is a public SomaFM channel and is NOT licensed to this station. Replace the URL and name with your own stream before the site goes public.',
    metadata_url: 'https://somafm.com/songs/groovesalad.json',
    is_live: false,
    display_order: 0,
  },
  {
    name: 'Sample stream 2 (SomaFM) - replace before launch',
    stream_url: 'https://ice1.somafm.com/dronezone-128-mp3',
    genre: 'Placeholder',
    description:
      'PLACEHOLDER ONLY. This is a public SomaFM channel and is NOT licensed to this station. Replace the URL and name with your own stream before the site goes public.',
    is_live: false,
    display_order: 1,
  },
  {
    name: 'Sample stream 3 (SomaFM) - replace before launch',
    stream_url: 'https://ice1.somafm.com/lush-128-mp3',
    genre: 'Placeholder',
    description:
      'PLACEHOLDER ONLY. This is a public SomaFM channel and is NOT licensed to this station. Replace the URL and name with your own stream before the site goes public.',
    is_live: false,
    display_order: 2,
  },
];

const ARTICLES = [
  {
    category: 'Politics',
    title: 'Parliament passes long-awaited digital media reform bill',
    excerpt: 'The bill introduces a licensing framework for online broadcasters and takes effect at the start of the next financial year.',
    is_featured: true,
    is_breaking: true,
    content: `<p>After eighteen months of committee hearings, the digital media reform bill has cleared its final reading. The legislation establishes a licensing framework for online broadcasters and sets out minimum transparency requirements for platforms that syndicate news content.</p>
<h2>What changes</h2>
<p>Operators streaming audio to more than 50,000 monthly listeners will be required to register, publish an ownership declaration, and maintain a complaints register open to public inspection.</p>
<blockquote>The point is not to burden small broadcasters. It is to make ownership legible to the people listening.</blockquote>
<p>Industry groups have broadly welcomed the clarity while warning that the compliance timetable is tight for independent stations.</p>`,
  },
  {
    category: 'Tech',
    title: 'Streaming platforms move to low-latency protocols as audiences fragment',
    excerpt: 'Broadcasters are replacing legacy buffering strategies with chunked delivery to close the gap between live and listener.',
    is_featured: true,
    content: `<p>The gap between a live source and the listener's speaker has quietly become a competitive metric. Where a thirty-second delay was once acceptable, sports and talk formats are now pushing for under five.</p>
<h2>Why latency matters</h2>
<p>Interactive formats — call-ins, live voting, second-screen commentary — break down when the audience is a half-minute behind the studio.</p>
<p>The trade-off is resilience: shorter buffers mean less protection against a listener's unstable connection, so most platforms now adapt the buffer dynamically rather than fixing it.</p>`,
  },
  {
    category: 'Sports',
    title: 'Late equaliser sends the derby to a replay',
    excerpt: 'A ninety-fourth minute header cancelled out a two-goal deficit and forced a midweek replay.',
    content: `<p>It looked settled at the hour mark. Two goals down and a man short, the visitors had spent twenty minutes defending the edge of their own box.</p>
<p>Then came a corner, a flick at the near post, and a header that went in off the underside of the bar.</p>
<h2>What happens next</h2>
<p>The replay is scheduled for Wednesday evening. Both managers confirmed they expect to rotate heavily.</p>`,
  },
  {
    category: 'Entertainment',
    title: 'Inside the KK Factor studio: building a newsroom that also plays records',
    excerpt: 'A look at how a single control room handles rolling news, live radio and an on-demand music library.',
    is_featured: true,
    content: `<p>The studio was designed around one constraint: a presenter should be able to move from a news read to a music bed without touching a second desk.</p>
<h2>One rundown, three outputs</h2>
<p>Editorial, live radio and the on-demand library all draw from the same content management system, so a story published to the website is available to the presenter within seconds.</p>
<p>That integration is the whole premise of the platform — the audience should not have to switch apps, and neither should the people making it.</p>`,
  },
  {
    category: 'Latest',
    title: 'Weather warning issued for the coastal districts through the weekend',
    excerpt: 'Residents are advised to secure loose property and avoid non-essential travel along the coast road.',
    is_breaking: true,
    content: `<p>A severe weather warning covering the coastal districts remains in force until Sunday evening, with sustained winds and localised flooding expected.</p>
<p>Emergency services have asked residents to secure loose property and to avoid non-essential travel along the coast road.</p>
<h2>Where to get updates</h2>
<p>Rolling updates will run on the KK Newsroom stream and on this page as conditions change.</p>`,
  },
  {
    category: 'Politics',
    title: 'Councils given six months to publish open budget data',
    excerpt: 'Local authorities must move spending records into a machine-readable format under the new transparency directive.',
    content: `<p>Every council will be required to publish its spending records in a machine-readable format within six months, under a directive signed off this week.</p>
<h2>What has to change</h2>
<p>Quarterly PDFs will no longer satisfy the requirement. Authorities must supply structured data covering procurement, grants and contractor payments above a set threshold.</p>
<p>Smaller councils have been offered a shared platform to avoid each building its own reporting stack.</p>`,
  },
  {
    category: 'Politics',
    title: 'Cross-party committee calls for clearer broadcast ownership rules',
    excerpt: 'The report recommends a single public register of media ownership, updated annually.',
    content: `<p>A cross-party committee has recommended a single public register of media ownership, arguing the current picture is spread across too many filings to be useful.</p>
<p>The proposal would require annual declarations from any outlet above a defined audience threshold, published in one place and free to search.</p>`,
  },
  {
    category: 'Sports',
    title: 'Record crowd expected for the season opener',
    excerpt: 'Advance sales have already passed last year\u2019s total with a fortnight still to go.',
    content: `<p>Advance ticket sales for the season opener have already passed last year's final attendance, with a fortnight of general sale still to run.</p>
<h2>Getting there</h2>
<p>Extra services are being laid on either side of kick-off, and the club has asked supporters to arrive early to spread the load at the turnstiles.</p>`,
  },
  {
    category: 'Sports',
    title: 'Veteran keeper signs a one-year extension',
    excerpt: 'The 34-year-old will stay for a ninth season after a run of eleven clean sheets.',
    content: `<p>The 34-year-old goalkeeper has signed a one-year extension, committing to a ninth season at the club after a run of eleven clean sheets in the second half of the campaign.</p>
<p>The deal includes an option for a further year tied to appearances.</p>`,
  },
  {
    category: 'Sports',
    title: 'Athletics squad names its travelling roster',
    excerpt: 'Two debutants make the cut for the regional championships next month.',
    content: `<p>Two debutants have made the travelling roster for next month's regional championships, both selected on the strength of season-best marks set in the past six weeks.</p>
<p>The head coach described the squad as the strongest in four years across the middle-distance events.</p>`,
  },
  {
    category: 'Tech',
    title: 'Browsers move to shorter certificate lifetimes',
    excerpt: 'The change pushes operators toward automated renewal and away from manual certificate management.',
    content: `<p>Major browsers have agreed to shorten the maximum accepted certificate lifetime, a change that effectively forces operators onto automated renewal.</p>
<h2>What it means in practice</h2>
<p>Sites already using automated issuance will notice nothing. Anyone still renewing by hand once a year has a process problem to solve before the deadline.</p>`,
  },
  {
    category: 'Tech',
    title: 'Why the single-tab media platform is having a moment',
    excerpt: 'Audiences are consolidating. The products that win are the ones that stop asking people to context-switch.',
    content: `<p>Fragmentation defined the last decade of digital media: one app for news, another for radio, a third for music.</p>
<p>The reversal now underway is driven less by technology than by attention. Every switch between apps is an opportunity to lose the listener, and the platforms that removed those switches are the ones holding sessions together.</p>`,
  },
  {
    category: 'Tech',
    title: 'Open-source audio codec reaches its first stable release',
    excerpt: 'Early benchmarks suggest a meaningful bitrate saving on speech-heavy content.',
    content: `<p>The codec's first stable release landed this week after three years in development, with early benchmarks pointing to a meaningful bitrate saving on speech-heavy material.</p>
<p>Broadcasters have been cautious, noting that decoder support across older devices remains the deciding factor for live use.</p>`,
  },
  {
    category: 'Entertainment',
    title: 'Late-night radio finds a second audience online',
    excerpt: 'On-demand replays of overnight shows are outperforming their live slots.',
    content: `<p>On-demand replays of overnight programming are consistently outperforming the live slots that produced them, according to figures shared by several independent stations.</p>
<h2>A different listen</h2>
<p>Producers say the audience treats the replay as a podcast rather than radio, which is changing how the shows are structured.</p>`,
  },
  {
    category: 'Entertainment',
    title: 'Festival line-up leans on local acts',
    excerpt: 'Two-thirds of this year\u2019s bill is drawn from within the region.',
    content: `<p>Two-thirds of this year's festival bill is drawn from within the region, the largest local share since the event began.</p>
<p>Organisers put the shift down to a deliberate booking policy rather than budget pressure, though they acknowledged travel costs played a part.</p>`,
  },
  {
    category: 'Latest',
    title: 'Roadworks on the coast route begin on Monday',
    excerpt: 'Expect single-lane running between the harbour junction and the north bridge for six weeks.',
    content: `<p>Resurfacing on the coast route begins on Monday, with single-lane running between the harbour junction and the north bridge for an expected six weeks.</p>
<p>Work will pause during the festival weekend to keep the route clear.</p>`,
  },
  {
    category: 'Latest',
    title: 'Library reopens after a six-month refit',
    excerpt: 'The refurbished building adds a recording booth and extended evening hours.',
    content: `<p>The central library reopens this weekend after a six-month refit that has added a small recording booth, a quiet study floor and extended evening hours on weekdays.</p>
<p>Membership remains free for residents.</p>`,
  },
];


/**
 * Cover art for the seeded articles, keyed by slug. The files live in
 * server/seed-assets/news (tracked in git) and are copied into the uploads
 * folder on seed, so a fresh clone gets working images without any manual step.
 * All CC0 — see server/seed-assets/README.md.
 */
const ARTICLE_IMAGES = {
  'athletics-squad-names-its-travelling-roster': 'news-athletics-squad-names-its-travelling-roster.jpg',
  'browsers-move-to-shorter-certificate-lifetimes': 'news-browsers-move-to-shorter-certificate-lifetim.jpg',
  'councils-given-six-months-to-publish-open-budget-data': 'news-councils-given-six-months-to-publish-open-bu.jpg',
  'cross-party-committee-calls-for-clearer-broadcast-ownership-rules': 'news-cross-party-committee-calls-for-clearer-broa.jpg',
  'festival-line-up-leans-on-local-acts': 'news-festival-line-up-leans-on-local-acts.jpg',
  'inside-the-kk-factor-studio-building-a-newsroom-that-also-plays-records': 'news-inside-the-kk-factor-studio-building-a-newsr.jpg',
  'late-equaliser-sends-the-derby-to-a-replay': 'news-late-equaliser-sends-the-derby-to-a-replay.jpg',
  'late-night-radio-finds-a-second-audience-online': 'news-late-night-radio-finds-a-second-audience-onl.jpg',
  'library-reopens-after-a-six-month-refit': 'news-library-reopens-after-a-six-month-refit.jpg',
  'open-source-audio-codec-reaches-its-first-stable-release': 'news-open-source-audio-codec-reaches-its-first-st.jpg',
  'parliament-passes-long-awaited-digital-media-reform-bill': 'news-parliament-passes-long-awaited-digital-media.jpg',
  'record-crowd-expected-for-the-season-opener': 'news-record-crowd-expected-for-the-season-opener.jpg',
  'roadworks-on-the-coast-route-begin-on-monday': 'news-roadworks-on-the-coast-route-begin-on-monday.jpg',
  'streaming-platforms-move-to-low-latency-protocols-as-audiences-fragment': 'news-streaming-platforms-move-to-low-latency-prot.jpg',
  'veteran-keeper-signs-a-one-year-extension': 'news-veteran-keeper-signs-a-one-year-extension.jpg',
  'weather-warning-issued-for-the-coastal-districts-through-the-weekend': 'news-weather-warning-issued-for-the-coastal-distr.jpg',
  'why-the-single-tab-media-platform-is-having-a-moment': 'news-why-the-single-tab-media-platform-is-having-.jpg'
};

const SEED_IMAGE_DIR = path.resolve(__dirname, '..', 'seed-assets', 'news');

/** Copies one seed image into uploads/images and returns its public URL. */
function installSeedImage(slug) {
  const file = ARTICLE_IMAGES[slug];
  if (!file) return null;

  const source = path.join(SEED_IMAGE_DIR, file);
  if (!fs.existsSync(source)) return null;

  fs.mkdirSync(config.uploads.imagesDir, { recursive: true });
  const target = path.join(config.uploads.imagesDir, file);
  if (!fs.existsSync(target)) fs.copyFileSync(source, target);

  return `/uploads/images/${file}`;
}

async function seed() {
  const fresh = process.argv.includes('--fresh');

  await connectDatabase();

  if (fresh) {
    // Drop the collections this seed owns, leaving anything else untouched.
    for (const Model of [Article, Category, Track, Playlist, RadioStream, User]) {
      await Model.deleteMany({});
    }
    console.log('[seed] Database cleared');
  }

  /* --- Admin ------------------------------------------------------------- */
  let admin = await User.findOne({ email: config.seed.adminEmail });
  const adminCreated = !admin;
  if (!admin) {
    admin = await User.create({
      name: 'KK Factor Admin',
      email: config.seed.adminEmail,
      password_hash: await User.hashPassword(config.seed.adminPassword),
      role: 'admin',
    });
  }
  console.log(`[seed] Admin ${adminCreated ? 'created' : 'already present'}: ${admin.email}`);

  let reader = await User.findOne({ email: 'listener@kkfactor.com' });
  if (!reader) {
    reader = await User.create({
      name: 'Sample Listener',
      email: 'listener@kkfactor.com',
      password_hash: await User.hashPassword('Listener@123'),
      role: 'user',
    });
  }

  /* --- Categories -------------------------------------------------------- */
  const categoryByName = {};
  for (const spec of CATEGORIES) {
    const slug = slugify(spec.name);
    const category = await Category.findOneAndUpdate(
      { slug },
      { $setOnInsert: { ...spec, slug } },
      { returnDocument: 'after', upsert: true }
    );
    categoryByName[spec.name] = category;
  }
  console.log(`[seed] ${CATEGORIES.length} categories ready`);

  /* --- Articles -----------------------------------------------------------
   * OFF by default. The newsroom panel is filled from the Greek City Times
   * feed (npm run feeds:refresh), so seeding invented stories alongside real
   * ones only makes it harder to tell which is which.
   *
   *   npm run db:seed -- --demo-articles     to put the samples back
   * --------------------------------------------------------------------- */
  const wantDemoArticles = process.argv.includes('--demo-articles');
  let articleCount = 0;
  let backfilled = 0;

  for (const [index, spec] of (wantDemoArticles ? ARTICLES : []).entries()) {
    const slug = slugify(spec.title);
    const imageUrl = installSeedImage(slug);

    const existing = await Article.findOne({ slug });

    if (!existing) {
      await Article.create({
        title: spec.title,
        slug,
        content: spec.content,
        excerpt: spec.excerpt,
        image_url: imageUrl,
        category_id: categoryByName[spec.category]._id,
        author_id: admin._id,
        status: 'published',
        // Stagger publication so the "latest first" ordering is visible.
        published_at: new Date(Date.now() - index * 6 * 60 * 60 * 1000),
        is_featured: Boolean(spec.is_featured),
        is_breaking: Boolean(spec.is_breaking),
        views: Math.floor(Math.random() * 900) + 50,
      });
      articleCount += 1;
    } else if (imageUrl && !existing.image_url) {
      // An article seeded before the cover art shipped would keep a null image
      // for ever. Backfilling here means a plain `npm run db:seed` picks up new
      // assets without needing --fresh, which would destroy real content.
      existing.image_url = imageUrl;
      await existing.save();
      backfilled += 1;
    }
  }

  console.log(
    wantDemoArticles
      ? `[seed] ${articleCount} sample articles inserted`
      : '[seed] Sample articles skipped - run `npm run feeds:refresh` for real news'
  );
  if (backfilled) console.log(`[seed] ${backfilled} existing articles given cover images`);

  /* --- Radio streams ----------------------------------------------------- */
  for (const spec of STREAMS) {
    await RadioStream.findOneAndUpdate(
      { name: spec.name },
      { $setOnInsert: spec },
      { upsert: true }
    );
  }
  console.log(`[seed] ${STREAMS.length} radio streams ready`);

  /* --- Demo tracks + playlist -------------------------------------------- */
  const generated = generateDemoTracks(config.uploads.tracksDir);
  const trackMeta = [
    { title: 'Midnight Drive', artist: 'KK Sessions', album: 'Studio Demos', genre: 'Ambient' },
    { title: 'Harbour Lights', artist: 'KK Sessions', album: 'Studio Demos', genre: 'Ambient' },
    { title: 'Static Signal', artist: 'The Newsroom Band', album: 'Off Air', genre: 'Electronic' },
    { title: 'Open Frequency', artist: 'The Newsroom Band', album: 'Off Air', genre: 'Electronic' },
  ];

  const tracks = [];
  for (const [index, meta] of trackMeta.entries()) {
    const asset = generated[index];
    const track = await Track.findOneAndUpdate(
      { file_url: asset.url },
      { $setOnInsert: { ...meta, file_url: asset.url, duration: asset.duration, uploaded_by: admin._id } },
      { returnDocument: 'after', upsert: true }
    );
    tracks.push(track);
  }
  console.log(`[seed] ${tracks.length} demo tracks ready`);

  // Play order is simply the array order — no join table needed.
  const playlist = await Playlist.findOneAndUpdate(
    { slug: 'kk-factor-essentials' },
    {
      $setOnInsert: {
        name: 'KK Factor Essentials',
        slug: 'kk-factor-essentials',
        description: 'A starter playlist built from the studio demo library.',
        created_by: admin._id,
        is_public: true,
        track_ids: tracks.map((t) => t._id),
      },
    },
    { returnDocument: 'after', upsert: true }
  );
  console.log(`[seed] Playlist "${playlist.name}" ready`);

  console.log('\n[seed] Done. Sign in with:');
  console.log(`       admin    ${config.seed.adminEmail} / ${config.seed.adminPassword}`);
  console.log(`       listener ${reader.email} / Listener@123`);
}

seed()
  .then(async () => {
    await disconnectDatabase();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[seed] Failed:', error.message);
    if (/ECONNREFUSED|ServerSelection/i.test(error.message)) {
      console.error('[seed] MongoDB is not reachable — check that it is running,');
      console.error('[seed] or that MONGODB_URI in server/.env is correct.');
    }
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });

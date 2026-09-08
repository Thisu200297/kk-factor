# The KK Factor

The website for **THE KK FACTOR — Roula Krikellis**: the Greek Eurobeat show
broadcast on RPP FM 98.7/98.3 and streamed live on YouTube.

One Node service serves both the REST API and the built React site, so the whole
thing runs on a single origin — no CORS to configure, and the refresh cookie is
never a third-party cookie (which Safari blocks by default).

---

## What it does

| | |
| --- | --- |
| **Sponsors** | A strip across the top of every page, managed from the dashboard: add, remove, reorder, upload a logo, and count clicks. A sponsor with no website shows a phone number and email instead. |
| **Organisations** | The same records with `kind: organisation` — a sidebar of the bodies Roula supports. |
| **Community news** | The three newest stories from Greek City Times, pulled from their RSS feed and linked back to them. |
| **The show** | A live banner while she is on air, and an episode archive that fills itself from the YouTube channel feed. |
| **Going live** | One switch turns the banner on and writes the social post she pastes into Facebook, Instagram, TikTok and LinkedIn. |
| **Music** | Her own playlist, uploaded as files, with a player that survives navigation. |
| **Gallery** | Photos and video from events. Video is a YouTube link rather than a file. |
| **Membership** | Normal and Premium listeners. An episode can be marked for members; the lock is enforced on the server. |

---

## Running it

You need **Node 18 or newer** and a MongoDB connection string (Atlas M0 is free).

```bash
# 1. Configuration
cd server
cp .env.example .env          # then fill in MONGODB_URI and the two JWT secrets

# 2. Install
npm install
npm install --prefix ../client

# 3. Content
npm run db:seed               # admin account, categories, radio placeholders
npm run db:partners           # the sponsors and organisations
npm run feeds:refresh         # news from Greek City Times, episodes from YouTube

# 4. Run — two terminals
npm run dev                   # API on :5000
npm run dev --prefix ../client   # site on :5173
```

The Vite dev server proxies `/api` and `/uploads` to `:5000`, so the browser
sees one origin in development too.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API with reload |
| `npm start` | API, production mode |
| `npm test` | The test suite — no database needed, runs in under a second |
| `npm run db:seed` | Admin account, categories, radio placeholders. Add `-- --demo-articles` for sample stories. |
| `npm run db:partners` | Sponsors and organisations |
| `npm run feeds:refresh` | Pull the news feed and the episode archive once |
| `npm run build` | Installs and builds the client into `client/dist` |

---

## How it is put together

```
server/
  app.js            middleware, static files, the built client
  server.js         boot: connect, build indexes, listen, start the importers
  config/           validated environment; every process.env read lives here
  models/           Mongoose schemas
  controllers/      one file per resource
  routes/           a list of gates, then a controller
  services/         the two feed importers and their scheduler
  middleware/       auth, uploads, rate limits, the single error funnel
  utils/            tokens, sanitising, slugs, pagination, media removal
  seed-assets/      images that ship with the repo (see below)
  tests/

client/src/
  pages/            one per route
  components/       Sponsors, Show, News, MusicPlayer, Admin, common
  context/          Auth, Player, Theme
  hooks/            useFetch, useAuth, usePlayer, useDebounce, …
  utils/            the axios instance and every endpoint helper
```

Every request follows the same shape: **a list of gates, then a controller**.
`POST /api/articles` passes through a rate limit, `requireAuth`, `requireAdmin`
and the field validators before the controller ever runs, and anything thrown
anywhere lands in one error handler that emits one JSON envelope. Read one route
file and you can read them all.

### Decisions worth knowing

**The episode archive fills itself.** She streams live on YouTube; YouTube keeps
the recording as an ordinary video the moment the stream ends; the importer reads
the channel's public Atom feed. No API key, no quota, and nobody uploads
anything. The feed carries no duration, which is why that one field is typed in
by hand.

**Going live is a switch, not a detector.** Asking YouTube whether a channel is
on air needs the Data API, and polling it would spend the whole daily quota
answering a question the presenter already knows — she is pressing "go live" on
YouTube at that moment anyway.

**The site does not post to social media.** It cannot: TikTok keeps anything an
unaudited app publishes private, Instagram needs a business account and Meta's
app review, and LinkedIn does not open personal-profile posting to ordinary
developers. So the site writes the post and she pastes it.

**Imported news links out.** Headline, photo and a short excerpt are stored and
the reader is sent to the publisher. Their feed does carry the full article, but
a feed exposing text is not a licence to republish it — `NEWS_FULL_TEXT` turns
that on if permission is ever given, with no code change. The feed carries no
images at all, so the importer falls back to each article's `og:image`.

**`seed-assets/` survives a wiped disk.** A free host's filesystem is erased on
every restart while the database keeps pointing at `/uploads/...`. The sponsor
logos and the sample media ship inside the repository and are served as a
fallback, so the strip across the top of the site can never come up empty.
Anything an editor uploads goes to Cloudinary under an absolute URL and never
reaches that handler.

**Premium is enforced on the server.** A locked episode is still listed — being
able to see that something exists is the point of a members tier — but the video
id is stripped from the response before it leaves the API.

---

## Tests

```bash
npm test
```

47 tests, no database, under two seconds. They cover the places this project has
actually had bugs: slug collisions, HTML entities in imported headlines, the six
shapes a YouTube link arrives in, pagination clamping, the fact that a refresh
token can never be presented as an access token, and the site being allowed to
call its own API.

---

## Deploying

`DEPLOY-STEPS.md` walks through it end to end on free plans — Render, MongoDB
Atlas, Cloudinary and cron-job.org. `render.yaml` is a blueprint for the same
thing.

Two things that are easy to get wrong:

- **`MONGODB_URI` must name the database.** Without `/kk_factor` before the `?`,
  the driver silently uses a database called `test`.
- **The feed refresh needs an outside scheduler.** A free instance sleeps after
  15 idle minutes and a sleeping instance runs no timers, so something has to
  call `POST /api/import/run` from outside.

---

## Licensing, before this goes public

Three things are the client's to sort out, not the code's:

1. **Music.** A broadcast licence covers playing music on air. It does not cover
   the same music streamed on demand from her own website. If uploaded tracks or
   full episodes contain commercial recordings, that is a separate licence
   (APRA AMCOS and PPCA in Australia).
2. **News.** Publishing Greek City Times' full articles needs their written
   permission. Headlines, excerpts and links back do not.
3. **Logos.** Every sponsor and organisation logo needs permission to use it.
   Showing an organisation's mark can read as an endorsement.

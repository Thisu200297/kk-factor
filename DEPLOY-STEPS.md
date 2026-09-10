# Putting The KK Factor online — free

Everything below is on a free plan. No card is needed at any step.

The whole site runs as **one** Render service: the Node server serves the API
*and* the React site. One URL, no CORS to configure, and no
third-party-cookie problem in Safari.

| Piece | Service | Cost |
| --- | --- | --- |
| Site + API | Render web service (free) | Free |
| Content database | MongoDB Atlas M0 | Free |
| Photos and audio an editor uploads | Cloudinary | Free |
| Keeping the news and episodes fresh | cron-job.org | Free |

---

## Before you start

Four accounts. All free, all sign-up-with-GitHub or email:

- **GitHub** — github.com (Render deploys from a repository)
- **Render** — render.com
- **Cloudinary** — cloudinary.com
- **cron-job.org** — cron-job.org

Atlas you already have.

---

## Step 1 — Let Atlas accept connections from Render

Render's free tier does not give your service a fixed IP address, so Atlas has
to accept connections from anywhere. The database is still protected by its
username and password.

1. Atlas → **Network Access** → **Add IP Address**
2. Choose **Allow access from anywhere** (`0.0.0.0/0`) → Confirm

Then check **Database Access** and make sure you know the username and password
— you need them in Step 4.

## Step 2 — Get your Cloudinary key

This is what stops photos and logos uploaded *from the dashboard* from being
erased. (The sponsor logos that came with the project are safe either way —
they ship inside the repository.)

1. Sign up at cloudinary.com
2. On the dashboard, find **API Environment variable** — it looks like:

```
CLOUDINARY_URL=cloudinary://123456789012345:AbCdEf...@your-cloud-name
```

3. Copy the whole thing, from `cloudinary://` onwards. Keep it somewhere safe.

## Step 3 — Put the project on GitHub

1. github.com → **New repository** → name it `kk-factor` → **Private** → Create
2. In the `kk-factor` folder on your computer, open PowerShell and run:

```powershell
git init
git add .
git commit -m "The KK Factor"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/kk-factor.git
git push -u origin main
```

`.gitignore` already keeps `server/.env`, `node_modules` and `uploads/` out of
the repository, so your database password is **not** uploaded to GitHub.

## Step 4 — Create the Render service

1. render.com → **New +** → **Web Service**
2. Connect your GitHub account and pick the `kk-factor` repository
3. Fill in:

| Field | Value |
| --- | --- |
| Name | `the-kk-factor` (this becomes your web address) |
| Language / Runtime | **Node** |
| Root Directory | `server` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Instance Type | **Free** |

> **Do not add `NODE_VERSION`.** `server/.node-version` already pins Node to 22.
> Left to itself Render installs the newest release that satisfies `engines`, and
> a brand-new major is not where you want to find out your dependencies disagree.

4. Open **Advanced** → **Add Environment Variable**, and add these:

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your Atlas string, **the `mongodb+srv://` one**, ending in `/kk_factor` |
| `JWT_SECRET` | click **Generate** |
| `JWT_REFRESH_SECRET` | click **Generate** |
| `IMPORT_SECRET` | click **Generate**, then copy the value — Step 6 needs it |
| `CLOUDINARY_URL` | the `cloudinary://...` string from Step 2 |
| `NEWS_FEED_URL` | `https://greekcitytimes.com/feed/` |
| `NEWS_SOURCE_NAME` | `Greek City Times` |
| `NEWS_FULL_TEXT` | `false` — see below before changing it |
| `NEWS_CATEGORY_IDS` | optional; leave unset to take every section they publish |
| `YOUTUBE_CHANNEL_ID` | `UC2g-gkU4Hwc3tGd3hkv5E1Q` |
| `IMPORT_INTERVAL_MINUTES` | `30` |
| `PUBLIC_SITE_URL` | your Render address, once you have it (Step 5) |

The `MONGODB_URI` must look like this — note `/kk_factor` before the `?`:

```
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/kk_factor?retryWrites=true&w=majority
```

> **Use the `mongodb+srv://` form here, not the long one in `server/.env`.**
> That long form is only in your local file because some home internet
> connections refuse the DNS lookup `+srv` needs. Render's does not, and the
> `+srv` form keeps working if Atlas ever moves the cluster.

5. **Create Web Service**. The first build takes about five minutes.

When it finishes you get a web address like
`https://the-kk-factor.onrender.com`. That is the link you send the client.

## Step 5 — Set the site address

Go back to **Environment** and set `PUBLIC_SITE_URL` to the address Render just
gave you. It is used in the ready-made social post the "Go live" button writes.

## Step 6 — Keep the news and episodes coming

**This step is not optional.** Render stops a free service after 15 idle
minutes, and a stopped service runs no timers — so the feeds would only
refresh when somebody happened to be on the site.

1. cron-job.org → **Create cronjob**
2. Fill in:

| Field | Value |
| --- | --- |
| Title | `KK Factor feeds` |
| URL | `https://YOUR-SITE.onrender.com/api/import/run` |
| Schedule | Every **30 minutes** |
| Request method | **POST** |

3. Open **Advanced** → **Headers** and add one:

```
x-import-secret: <the IMPORT_SECRET you generated in Step 4>
```

4. Save, then press **Test run**. It should answer `200`.

This also keeps the site awake during the day, so visitors are far less likely
to hit the one-minute wake-up.

## Step 7 — First fill

Open your Render address and sign in with the admin account, then:

- **Dashboard → The show → Refresh from YouTube** — pulls the episodes in
- **Dashboard → Sponsors** — check the five sponsors and five organisations
  came across, and that the logos are showing

## Step 8 — Check it

- [ ] Sponsor logos appear across the top
- [ ] Three Greek City Times stories in the sidebar, and clicking one opens
      their site
- [ ] The show section lists episodes, and one plays
- [ ] Sign in with the admin account works
- [ ] The admin dashboard opens
- [ ] Upload a test photo to a sponsor, then in Render press **Manual Deploy →
      Restart service**, and confirm the photo is **still there** afterwards.
      This is the check that proves Cloudinary is working.

---

## Three things to tell the client

**The site sleeps.** On the free plan Render stops the service after 15 minutes
with no visitors. The next person to arrive waits about a minute for it to wake
up. The cron job in Step 6 keeps it awake most of the day, but not overnight.
Paying about US$7 a month removes this completely, and is the one upgrade worth
making before she sends the link to sponsors.

**Uploaded files need Cloudinary.** Without `CLOUDINARY_URL`, anything uploaded
from the dashboard disappears the next time the service restarts. The logos
that shipped with the project are unaffected.

**The news is headlines and links until the publisher says otherwise.** By
default the site shows Greek City Times' headline, photo and a two-line summary
and sends the reader to them. With their written permission, set
`NEWS_FULL_TEXT=true` in Render — no code change and no redeploy needed beyond
the restart Render does for you. Imported stories then open on this site, each
carrying the journalist's byline, the credit, and a canonical link back.

Two things to settle in the same email as the permission:

- **The photographs.** Newsrooms license agency pictures for their own site
  and often cannot pass that on. Permission for the words is not permission
  for the images.
- **Which sections.** They publish about a hundred, and most of the volume is
  wire copy about places this audience did not tune in for. `npm run
  news:categories` lists them with counts and suggests a set; put the ids in
  `NEWS_CATEGORY_IDS`.

To pull in their back catalogue once, set `NEWS_IMPORT_PAGES` to 5 or 10, let
one refresh run, then put it back to `1`. Thirty stories a page, and it is
idempotent, so nothing is duplicated if you run it twice.

## If something goes wrong

| What you see | Cause | Fix |
| --- | --- | --- |
| Build fails on Render | Root Directory not set to `server` | Settings → Root Directory → `server` |
| `sh: 1: vite: not found` | Render sets `NODE_ENV=production`, and npm then skips devDependencies — which is where `vite` lives | Already fixed: the build script installs the client with `--include=dev`. If you ever rewrite it, keep that flag. |
| Something breaks only on Render, never locally | Render picks the newest Node that satisfies `engines`, which can be a version released last week | `server/.node-version` pins it to 22. Change that file, not `engines`, to move versions. |
| Site loads but no news or episodes | The feeds have never run | Dashboard → The show → **Refresh from YouTube**, and check the Step 6 cron job |
| Site loads but nothing at all | `MONGODB_URI` wrong, or Atlas is not allowing Render | Re-check Step 1 and the `/kk_factor` part of the string |
| `querySrv EREFUSED` in the logs | DNS cannot resolve the `+srv` address | Rare on Render. Use the long `mongodb://` form from `server/.env` instead |
| `bad auth` in the logs | Database username or password wrong | Atlas → Database Access → Edit Password |
| Uploaded photos vanish after a restart | `CLOUDINARY_URL` missing or wrong | Render → Environment → re-add it, then redeploy |
| Sponsor logos missing | The repo was pushed without `server/seed-assets/partners` | Check the folder is in git, then redeploy |
| The live banner will not turn on | The YouTube link was not a watch/live URL | Paste the full `https://www.youtube.com/watch?v=...` link |

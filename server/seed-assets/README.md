# Seed image assets

The 17 photographs in `news/` are the placeholder cover images used by
`npm run db:seed`. They are copied into `uploads/images/` when the seed runs.

## Licence

Every image is **CC0 / public domain**, sourced through [Openverse](https://openverse.org).
CC0 places no restriction on use: **no attribution is required, and commercial use is
permitted**. The table below is kept as a provenance record, not because attribution is
owed.

Images were centre-cropped to 16:9 and re-encoded as JPEG (quality 84). None were upscaled,
so all are sharp at the sizes the interface renders them.

## Why not Google Images

Search results on Google Images are mostly **copyrighted** and carry no usable licence.
Using them in a client-facing product creates real legal exposure — §10 of the project
proposal already identifies content licensing as a project risk. CC0 sources avoid the
problem entirely.

## Replacing these

They are placeholders. Real editorial photography should be uploaded through
**Admin → Articles → Cover image**, which stores files under `uploads/images/` and points the
article's `image_url` at them. Nothing in the application depends on these particular files.

## Provenance

| File | Original title | Provider | Source |
| --- | --- | --- | --- |
| `news-athletics-squad-names-its-travelling-roster.jpg` | 正田醤油スタジアム | flickr | https://www.flickr.com/photos/121004196@N06/16750851471 |
| `news-browsers-move-to-shorter-certificate-lifetim.jpg` | Laptop Apple | stocksnap | https://stocksnap.io/photo/laptop-apple-B6GYMTH73U |
| `news-councils-given-six-months-to-publish-open-bu.jpg` | Buildings.GovernmentCenter.Newark | — | https://commons.wikimedia.org/w/index.php?curid=143874228 |
| `news-cross-party-committee-calls-for-clearer-broa.jpg` | Round Table, chairs, TV monitor, conference room, 2n | flickr | https://www.flickr.com/photos/71401718@N00/5526839767 |
| `news-festival-line-up-leans-on-local-acts.jpg` | They Might Be Giants at the 2017 Nelsonville Music F | flickr | https://www.flickr.com/photos/140641142@N05/34244472884 |
| `news-inside-the-kk-factor-studio-building-a-newsr.jpg` | Sound mixer | flickr | https://www.flickr.com/photos/157635012@N07/48863714927 |
| `news-late-equaliser-sends-the-derby-to-a-replay.jpg` | 2015_03_01_Warta_Nabadda_Football-4 | flickr | https://www.flickr.com/photos/61765479@N08/16068870104 |
| `news-late-night-radio-finds-a-second-audience-onl.jpg` | Girl in headphones (cropped) | wikimedia | https://commons.wikimedia.org/w/index.php?curid=79385330 |
| `news-library-reopens-after-a-six-month-refit.jpg` | SSPX0198 | flickr | https://www.flickr.com/photos/55958070@N08/5420527397 |
| `news-open-source-audio-codec-reaches-its-first-st.jpg` | A close-up view of an audio mixing console featuring | — | https://wordpress.org/photos/photo/6826833595/ |
| `news-parliament-passes-long-awaited-digital-media.jpg` | 20170822-200703LC | flickr | https://www.flickr.com/photos/92947007@N03/41042319655 |
| `news-record-crowd-expected-for-the-season-opener.jpg` | ASU Graduation Day | flickr | https://www.flickr.com/photos/37996646802@N01/2477470942 |
| `news-roadworks-on-the-coast-route-begin-on-monday.jpg` | 2020_Psary_road_construction_066 | flickr | https://www.flickr.com/photos/96541566@N06/52652478101 |
| `news-streaming-platforms-move-to-low-latency-prot.jpg` | A messy network server room showing wires, patch pan | wordpress | https://wordpress.org/photos/photo/64767dd6fa/ |
| `news-veteran-keeper-signs-a-one-year-extension.jpg` | Fairlop Rovers 0 v Dagenham Utd 3 Another great save | flickr | https://www.flickr.com/photos/195680760@N03/53465488938 |
| `news-weather-warning-issued-for-the-coastal-distr.jpg` | Iron sculpture “The Comb of the Wind” on the rocks o | — | https://wordpress.org/photos/photo/800679d106/ |
| `news-why-the-single-tab-media-platform-is-having-.jpg` | Woman with smartphone, Moscow | flickr | https://www.flickr.com/photos/157635012@N07/33940339288 |

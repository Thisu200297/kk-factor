import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../hooks/useAuth';
import { episodesApi, showApi } from '../../utils/api';
import { formatRelative, formatDuration, classNames } from '../../utils/format';

/**
 * THE SHOW — the part of the site her own mockup had no room for.
 *
 * It is one dark band in an otherwise light page, so it reads as the studio:
 * the current or most recent episode large on the left, the archive beside it.
 *
 * The archive fills itself. She streams live on YouTube, YouTube keeps the
 * recording as an ordinary video the moment the stream ends, and the importer
 * reads the channel feed — so "the episode is saved on the website when the
 * live finishes" needs nobody to upload anything.
 *
 * The video only loads once someone presses play. Embedding YouTube's iframe
 * on page load would pull in their player and their cookies for every visitor
 * who never watches, which is slow and rude.
 */
export default function ShowSection({ limit = 4 }) {
  const fetchLive = useCallback(() => showApi.getLive(), []);
  const fetchLatest = useCallback(() => episodesApi.latest(), []);
  const fetchList = useCallback(() => episodesApi.list({ limit: limit + 1 }), [limit]);

  const live = useFetch(fetchLive);
  const latest = useFetch(fetchLatest);
  const list = useFetch(fetchList);

  const liveState = live.data?.live;
  const isLive = Boolean(liveState?.isLive && liveState?.videoId);

  const featured = latest.data?.episode || null;
  const earlier = (list.data?.items || []).filter((item) => item.id !== featured?.id).slice(0, limit);

  const loading = latest.loading && list.loading;

  return (
    <section className="bg-[rgb(25_19_32)] text-[rgb(244_240_246)]">
      <div className="container-page py-11 md:py-14">
        <header className="mb-7 flex flex-wrap items-end gap-4">
          <div>
            <p className="text-label-md uppercase text-accent">The show</p>
            <h2 className="mt-2 text-headline-lg">The Greek Eurobeat Show</h2>
            <p className="mt-2 text-sm text-[rgb(167_155_178)]">
              Live on YouTube, and saved here the moment it finishes.
            </p>
          </div>

          <Link
            to="/show"
            className="ml-auto rounded-full border border-white/15 px-5 py-2.5 text-[0.8125rem] font-medium text-white transition-colors hover:border-white/40"
          >
            All episodes
          </Link>
        </header>

        {loading ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <div className="skeleton aspect-video w-full rounded-xl" />
            <div className="space-y-4">
              {[0, 1, 2].map((key) => (
                <div key={key} className="flex gap-3.5">
                  <div className="skeleton h-10 w-16 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-full" />
                    <div className="skeleton h-2.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !featured && !isLive ? (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-14 text-center">
            <Icon name="radio" size={34} className="mx-auto text-white/30" />
            <p className="mt-3 text-base font-semibold">No episodes yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-[rgb(167_155_178)]">
              Episodes appear here on their own once the show has been live on YouTube.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <Player
                videoId={isLive ? liveState.videoId : featured?.youtube_id}
                thumbnail={featured?.thumbnail_url}
                title={isLive ? liveState.title : featured?.title}
                locked={!isLive && featured?.locked}
                badge={isLive ? 'Live now' : 'Latest episode'}
                accent={isLive}
                duration={!isLive && featured?.duration ? formatDuration(featured.duration) : null}
              />

              <h3 className="mt-4 text-headline-sm">
                {isLive ? liveState.title : featured?.title}
              </h3>
              {!isLive && featured && (
                <p className="mt-1.5 text-[0.8125rem] text-[rgb(167_155_178)]">
                  {formatRelative(featured.published_at)}
                  {featured.duration ? ` · ${formatDuration(featured.duration)}` : ''}
                </p>
              )}
            </div>

            <div className="min-w-0">
              <p className="mb-3.5 text-label-md uppercase text-[rgb(125_113_137)]">
                Earlier episodes
              </p>
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {earlier.map((episode) => (
                  <li key={episode.id}>
                    <Link
                      to={`/show/${episode.slug}`}
                      className="group flex items-center gap-3.5 py-3.5 transition-opacity hover:opacity-80"
                    >
                      <span className="relative h-10 w-16 shrink-0 overflow-hidden rounded-md bg-white/5">
                        {episode.thumbnail_url && (
                          <img
                            src={episode.thumbnail_url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        )}
                        {episode.locked && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <Icon name="password" size={14} className="text-accent" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 block text-[0.8438rem] font-medium">
                          {episode.title}
                        </span>
                        <span className="mt-0.5 block text-[0.7188rem] text-[rgb(125_113_137)]">
                          {formatRelative(episode.published_at)}
                          {episode.duration ? ` · ${formatDuration(episode.duration)}` : ''}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
                {earlier.length === 0 && (
                  <li className="py-4 text-[0.8125rem] text-[rgb(125_113_137)]">
                    Nothing else in the archive yet.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Click-to-load YouTube. Until the viewer presses play this is just an image
 * and a button — no third-party script, no cookies, no request to YouTube.
 */
export function Player({ videoId, thumbnail, title, locked, badge, accent, duration }) {
  const [playing, setPlaying] = useState(false);
  const { isAuthenticated } = useAuth();

  const poster = thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null);

  if (locked) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-accent/30 bg-white/[0.03] px-6 text-center">
        <Icon name="password" size={30} className="text-accent" />
        <p className="text-base font-semibold">This episode is for members</p>
        <p className="max-w-sm text-sm text-[rgb(167_155_178)]">
          {isAuthenticated
            ? 'Your account is on the standard level. Ask Roula to upgrade you to premium.'
            : 'Sign in with a premium account to listen.'}
        </p>
        {!isAuthenticated && (
          <Link to="/login" className="btn-primary mt-1">
            Sign in
          </Link>
        )}
      </div>
    );
  }

  if (playing && videoId) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title || 'The KK Factor'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => videoId && setPlaying(true)}
      disabled={!videoId}
      aria-label={videoId ? `Play ${title || 'the episode'}` : 'No video available'}
      className="group relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] disabled:cursor-not-allowed"
    >
      {poster && (
        <img
          src={poster}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 ease-apple group-hover:scale-[1.03]"
        />
      )}
      <span className="absolute inset-0 bg-black/25" aria-hidden="true" />

      <span className="absolute inset-0 flex items-center justify-center">
        <span
          className={classNames(
            'flex h-[72px] w-[72px] items-center justify-center rounded-full transition-transform duration-200 ease-apple group-hover:scale-105',
            accent ? 'bg-live shadow-glow' : 'bg-primary shadow-glow'
          )}
        >
          <Icon name="play_arrow" size={32} filled className="ml-1 text-white" />
        </span>
      </span>

      {badge && (
        <span
          className={classNames(
            'absolute left-4 top-4 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[0.625rem] font-bold uppercase tracking-[0.14em] backdrop-blur',
            accent ? 'bg-live text-white' : 'bg-black/60 text-accent'
          )}
        >
          {accent && <span className="h-1.5 w-1.5 animate-pulse-live rounded-full bg-white" />}
          {badge}
        </span>
      )}

      {duration && (
        <span className="absolute bottom-4 right-4 rounded-md bg-black/70 px-2 py-1 text-xs tabular-nums text-white">
          {duration}
        </span>
      )}
    </button>
  );
}

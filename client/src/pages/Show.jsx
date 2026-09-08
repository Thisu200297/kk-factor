import { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { Player } from '../components/Show/ShowSection';
import { ListSkeleton } from '../components/common/Loader';
import { EmptyState, ErrorState } from '../components/common/States';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { episodesApi, showApi } from '../utils/api';
import { formatRelative, formatDuration, classNames } from '../utils/format';

/**
 * The show page — one route for both the archive and a single episode.
 *
 * `/show` opens on whatever is current: the live stream if she is on air,
 * otherwise the newest episode. `/show/:slug` opens on that one. Either way
 * the archive sits underneath, so a listener who arrived for one episode can
 * see there are others without going anywhere.
 */
export default function Show() {
  const { slug } = useParams();

  const fetchLive = useCallback(() => showApi.getLive(), []);
  const fetchOne = useCallback(
    () => (slug ? episodesApi.get(slug) : episodesApi.latest()),
    [slug]
  );
  const fetchList = useCallback(() => episodesApi.list({ limit: 24 }), []);

  const live = useFetch(fetchLive);
  const current = useFetch(fetchOne);
  const list = useFetch(fetchList);

  const liveState = live.data?.live;
  // A named episode always wins: someone who followed a link to it should get it.
  const isLive = Boolean(!slug && liveState?.isLive && liveState?.videoId);

  const episode = current.data?.episode || null;
  const episodes = list.data?.items || [];

  useDocumentTitle(episode?.title || 'The Show');

  return (
    <div className="container-page py-8 md:py-11">
      <header className="mb-8">
        <p className="text-label-md uppercase text-primary">The show</p>
        <h1 className="mt-2 text-headline-lg">The Greek Eurobeat Show</h1>
        <p className="mt-2 max-w-2xl text-sm text-fg-muted">
          Live on YouTube from the RPP FM 98.7 studio, and kept here afterwards. Every episode
          appears on this page by itself once the stream ends.
        </p>
      </header>

      {current.loading ? (
        <div className="skeleton aspect-video w-full rounded-panel" />
      ) : current.error && slug ? (
        <ErrorState message={current.error} onRetry={current.refetch} />
      ) : !episode && !isLive ? (
        <EmptyState
          icon="radio"
          title="No episodes yet"
          description="Episodes arrive here on their own once the show has been live on YouTube."
        />
      ) : (
        <section className="rounded-panel bg-[rgb(25_19_32)] p-4 text-[rgb(244_240_246)] md:p-6">
          <Player
            videoId={isLive ? liveState.videoId : episode?.youtube_id}
            thumbnail={episode?.thumbnail_url}
            title={isLive ? liveState.title : episode?.title}
            locked={!isLive && episode?.locked}
            badge={isLive ? 'Live now' : null}
            accent={isLive}
            duration={!isLive && episode?.duration ? formatDuration(episode.duration) : null}
          />

          <div className="mt-5 flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-headline-md">{isLive ? liveState.title : episode?.title}</h2>
              {!isLive && episode && (
                <p className="mt-1.5 text-[0.8125rem] text-[rgb(167_155_178)]">
                  {formatRelative(episode.published_at)}
                  {episode.duration ? ` · ${formatDuration(episode.duration)}` : ''}
                  {episode.tier === 'premium' ? ' · Members' : ''}
                </p>
              )}
            </div>

            {!isLive && episode?.video_url && (
              <a
                href={episode.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-[0.8125rem] font-medium transition-colors hover:border-white/40"
              >
                <span className="flex items-center gap-1.5">
                  Watch on YouTube
                  <Icon name="open_in_new" size={14} />
                </span>
              </a>
            )}
          </div>

          {!isLive && episode?.description && (
            <p className="mt-4 max-w-prose whitespace-pre-line text-sm leading-relaxed text-[rgb(167_155_178)]">
              {episode.description}
            </p>
          )}
        </section>
      )}

      <section className="mt-11">
        <header className="mb-4 flex items-center gap-3">
          <h2 className="text-headline-md">All episodes</h2>
          {episodes.length > 0 && (
            <span className="text-sm text-fg-subtle">{episodes.length}</span>
          )}
        </header>

        {list.loading ? (
          <div className="card p-5">
            <ListSkeleton rows={5} />
          </div>
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.refetch} />
        ) : episodes.length === 0 ? (
          <EmptyState icon="radio" title="The archive is empty" />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {episodes.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/show/${item.slug}`}
                  className={classNames(
                    'card-interactive sheen group flex h-full flex-col overflow-hidden',
                    item.id === episode?.id && 'ring-2 ring-primary'
                  )}
                >
                  <span className="relative block aspect-video w-full overflow-hidden bg-surface-2">
                    {item.thumbnail_url && (
                      <img
                        src={item.thumbnail_url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-apple group-hover:scale-[1.04]"
                      />
                    )}
                    {item.locked && (
                      <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-accent">
                        <Icon name="password" size={11} />
                        Members
                      </span>
                    )}
                    {item.duration > 0 && (
                      <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[0.6875rem] tabular-nums text-white">
                        {formatDuration(item.duration)}
                      </span>
                    )}
                  </span>

                  <span className="flex flex-1 flex-col p-3">
                    <span className="line-clamp-2 text-[0.9375rem] font-semibold leading-snug text-fg transition-colors group-hover:text-primary">
                      {item.title}
                    </span>
                    <span className="mt-auto pt-2.5 text-[0.6875rem] text-fg-subtle">
                      {formatRelative(item.published_at)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

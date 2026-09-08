import { useCallback, useState } from 'react';
import Icon from '../components/common/Icon';
import Modal from '../components/common/Modal';
import { GridSkeleton } from '../components/common/Loader';
import { EmptyState, ErrorState } from '../components/common/States';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { mediaApi } from '../utils/api';
import { mediaUrl } from '../utils/constants';
import { classNames } from '../utils/format';

/**
 * The media gallery — photographs from events and interviews, and video.
 *
 * Videos are YouTube, not files: a gallery of her recordings would fill a free
 * storage tier in a fortnight, and every one of them is already on her
 * channel. Clicking one opens it here in a dialog rather than sending the
 * visitor away.
 */
export default function Gallery() {
  useDocumentTitle('Media gallery');

  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);

  const fetcher = useCallback(() => mediaApi.list(), []);
  const { data, loading, error, refetch } = useFetch(fetcher);

  const all = data?.items || [];
  const items = filter === 'all' ? all : all.filter((item) => item.kind === filter);

  const counts = {
    all: all.length,
    photo: all.filter((item) => item.kind === 'photo').length,
    video: all.filter((item) => item.kind === 'video').length,
  };

  return (
    <div className="container-page py-9 md:py-12">
      <header className="mb-7 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-headline-lg">Media gallery</h1>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">
            From the studio, the stage and everywhere in between.
          </p>
        </div>

        {all.length > 0 && (
          <div className="ml-auto flex rounded-full bg-surface-3 p-1">
            {[
              { id: 'all', label: 'Everything' },
              { id: 'photo', label: 'Photos' },
              { id: 'video', label: 'Video' },
            ]
              .filter((tab) => counts[tab.id] > 0)
              .map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={classNames(
                    'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                    filter === tab.id ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:text-fg'
                  )}
                >
                  {tab.label}
                </button>
              ))}
          </div>
        )}
      </header>

      {loading ? (
        <GridSkeleton count={8} columns={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="image"
          title="Nothing here yet"
          description="Photos and video from events will appear here."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setOpen(item)}
                className="card-interactive sheen group block w-full overflow-hidden text-left"
              >
                <span className="relative block aspect-[4/3] w-full overflow-hidden bg-surface-2">
                  {item.poster_url && (
                    <img
                      src={mediaUrl(item.poster_url)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-apple group-hover:scale-[1.04]"
                    />
                  )}
                  {item.kind === 'video' && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-glow">
                        <Icon name="play_arrow" size={22} filled className="ml-0.5 text-white" />
                      </span>
                    </span>
                  )}
                </span>

                <span className="block p-3">
                  <span className="line-clamp-2 block text-[0.8438rem] font-medium leading-snug text-fg">
                    {item.title}
                  </span>
                  {item.taken_at && (
                    <span className="mt-1 block text-[0.6875rem] text-fg-subtle">
                      {new Date(item.taken_at).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open?.title || ''} size="lg">
        {open?.kind === 'video' && open?.youtube_id ? (
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${open.youtube_id}?rel=0`}
              title={open.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        ) : (
          open?.poster_url && (
            <img
              src={mediaUrl(open.poster_url)}
              alt={open.title}
              className="max-h-[70vh] w-full rounded-xl object-contain"
            />
          )
        )}

        {open?.caption && <p className="mt-4 text-sm text-fg-muted">{open.caption}</p>}
      </Modal>
    </div>
  );
}

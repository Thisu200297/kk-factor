import Icon from '../common/Icon';
import { ListSkeleton } from '../common/Loader';
import { classNames } from '../../utils/format';
import CoverImage from '../common/CoverImage';
import { mediaUrl } from '../../utils/constants';

export default function PlaylistSidebar({
  playlists = [],
  loading = false,
  selectedId,
  onSelect,
  onSelectLibrary,
}) {
  return (
    <aside className="card flex h-full flex-col p-3">
      <h2 className="px-2 pb-3 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
        Your library
      </h2>

      <button
        type="button"
        onClick={onSelectLibrary}
        className={classNames(
          'mb-2 flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors',
          selectedId === null ? 'bg-fill/[0.09]' : 'hover:bg-fill/[0.055]'
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container/30 text-primary">
          <Icon name="library_music" size={20} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-on-surface">All tracks</span>
          <span className="block text-xs text-on-surface-variant">Everything in the library</span>
        </span>
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <ListSkeleton rows={4} />
        ) : playlists.length === 0 ? (
          <p className="px-2 py-4 text-sm text-on-surface-variant">
            No playlists yet. An admin can create them from the dashboard.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {playlists.map((playlist) => (
              <li key={playlist.id}>
                <button
                  type="button"
                  onClick={() => onSelect(playlist)}
                  className={classNames(
                    'flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors',
                    selectedId === playlist.id ? 'bg-fill/[0.09]' : 'hover:bg-fill/[0.055]'
                  )}
                >
                  <CoverImage
                    src={mediaUrl(playlist.cover_url)}
                    seed={playlist.slug || playlist.id}
                    zoomOnHover={false}
                    rounded="rounded-lg"
                    className="h-10 w-10 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-on-surface">
                      {playlist.name}
                    </span>
                    <span className="block text-xs text-on-surface-variant">
                      {playlist.tracks?.length ?? 0} track{playlist.tracks?.length === 1 ? '' : 's'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

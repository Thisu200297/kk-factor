import Icon from '../common/Icon';
import CoverImage from '../common/CoverImage';
import { usePlayer } from '../../hooks/usePlayer';
import { formatDuration, classNames } from '../../utils/format';
import { mediaUrl } from '../../utils/constants';

export default function TrackList({ tracks = [], onPlay, showAlbum = true }) {
  const { currentTrack, isMusicPlaying, toggleMusic, enqueue } = usePlayer();

  if (!tracks.length) return null;

  return (
    <ul className="divide-y divide-line">
      {tracks.map((track, index) => {
        const active = currentTrack?.id === track.id;

        return (
          <li
            key={track.id}
            className={classNames(
              'group flex items-center gap-3 px-2 py-2.5 transition-colors hover:bg-fill/[0.055] md:gap-4 md:px-3',
              active && 'bg-fill/[0.055]'
            )}
          >
            <button
              type="button"
              onClick={() => (active ? toggleMusic() : onPlay?.(index))}
              aria-label={active && isMusicPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
              className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg"
            >
              <CoverImage
                src={mediaUrl(track.cover_url)}
                seed={`${track.artist}-${track.id}`}
                zoomOnHover={false}
                className="h-full w-full"
              />
              <span
                className={classNames(
                  'absolute inset-0 flex items-center justify-center bg-black/55 transition-opacity',
                  active || 'opacity-0 group-hover:opacity-100'
                )}
              >
                <Icon name={active && isMusicPlaying ? 'pause' : 'play_arrow'} size={22} filled className="text-white" />
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <p className={classNames('truncate text-sm font-medium', active ? 'text-primary' : 'text-on-surface')}>
                {track.title}
              </p>
              <p className="truncate text-xs text-on-surface-variant">
                {track.artist}
                {showAlbum && track.album ? ` · ${track.album}` : ''}
              </p>
            </div>

            {active && isMusicPlaying && (
              <span className="equaliser hidden text-primary sm:flex" aria-label="Now playing">
                <span /><span /><span /><span />
              </span>
            )}

            <span className="hidden w-12 text-right text-xs tabular-nums text-on-surface-variant sm:block">
              {formatDuration(track.duration)}
            </span>

            <button
              type="button"
              onClick={() => enqueue(track)}
              className="btn-icon !h-8 !w-8 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
              aria-label={`Add ${track.title} to the queue`}
              title="Add to queue"
            >
              <Icon name="playlist_add" size={18} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

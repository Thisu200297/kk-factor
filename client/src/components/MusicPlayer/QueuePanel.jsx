import Icon from '../common/Icon';
import { usePlayer } from '../../hooks/usePlayer';
import { formatDuration, classNames } from '../../utils/format';
import { EmptyState } from '../common/States';

export default function QueuePanel() {
  const { queue, queueIndex, jumpTo, removeFromQueue } = usePlayer();

  if (!queue.length) {
    return (
      <EmptyState
        icon="queue_music"
        title="The queue is empty"
        description="Play a playlist or add tracks from the library to build a queue."
      />
    );
  }

  return (
    <ol className="space-y-0.5">
      {queue.map((track, index) => (
        <li
          key={`${track.id}-${index}`}
          className={classNames(
            'group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-fill/[0.055]',
            index === queueIndex && 'bg-fill/[0.055]'
          )}
        >
          <button
            type="button"
            onClick={() => jumpTo(index)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span
              className={classNames(
                'w-5 shrink-0 text-center text-xs tabular-nums',
                index === queueIndex ? 'text-primary' : 'text-on-surface-variant'
              )}
            >
              {index === queueIndex ? <Icon name="volume_up" size={16} /> : index + 1}
            </span>
            <span className="min-w-0">
              <span
                className={classNames(
                  'block truncate text-sm',
                  index === queueIndex ? 'font-medium text-primary' : 'text-on-surface'
                )}
              >
                {track.title}
              </span>
              <span className="block truncate text-xs text-on-surface-variant">{track.artist}</span>
            </span>
          </button>

          <span className="text-xs tabular-nums text-on-surface-variant">
            {formatDuration(track.duration)}
          </span>

          <button
            type="button"
            onClick={() => removeFromQueue(track.id)}
            className="btn-icon !h-7 !w-7 opacity-0 focus:opacity-100 group-hover:opacity-100"
            aria-label={`Remove ${track.title} from the queue`}
          >
            <Icon name="close" size={16} />
          </button>
        </li>
      ))}
    </ol>
  );
}

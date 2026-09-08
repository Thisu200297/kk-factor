import { useEffect, useState } from 'react';
import { usePlayer } from '../../hooks/usePlayer';
import { formatDuration } from '../../utils/format';

/**
 * Seekable progress bar. While the user is dragging, the local `scrub` value
 * takes over so the thumb does not fight the `timeupdate` events.
 */
export default function ProgressBar({ compact = false }) {
  const { progress, duration, seek, currentTrack } = usePlayer();
  const [scrub, setScrub] = useState(null);

  useEffect(() => setScrub(null), [currentTrack?.id]);

  const total = duration || currentTrack?.duration || 0;
  const value = scrub ?? progress;
  const percent = total > 0 ? Math.min(100, (value / total) * 100) : 0;

  const commit = (next) => {
    seek(next);
    setScrub(null);
  };

  return (
    <div className="flex w-full items-center gap-2">
      {!compact && (
        <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-on-surface-variant">
          {formatDuration(value)}
        </span>
      )}

      <input
        type="range"
        min="0"
        max={total || 100}
        step="0.1"
        value={value}
        disabled={!currentTrack || total === 0}
        onChange={(event) => setScrub(Number.parseFloat(event.target.value))}
        onMouseUp={(event) => commit(Number.parseFloat(event.target.value))}
        onTouchEnd={(event) => commit(Number.parseFloat(event.target.value))}
        onKeyUp={(event) => commit(Number.parseFloat(event.target.value))}
        aria-label="Seek"
        className="kk-range flex-1 disabled:cursor-not-allowed disabled:opacity-40"
        /* Through the theme tokens, so the track is not a dark bar with a
           lavender fill sitting in the middle of a light page. */
        style={{
          background: `linear-gradient(to right, rgb(var(--primary)) ${percent}%, rgb(var(--surface-3)) ${percent}%)`,
        }}
      />

      {!compact && (
        <span className="w-10 shrink-0 text-[11px] tabular-nums text-on-surface-variant">
          {formatDuration(total)}
        </span>
      )}
    </div>
  );
}

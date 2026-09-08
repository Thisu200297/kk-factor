import Icon from '../common/Icon';
import { Spinner, ListSkeleton } from '../common/Loader';
import { EmptyState, ErrorState } from '../common/States';
import { usePlayer } from '../../hooks/usePlayer';
import { classNames } from '../../utils/format';
import { mediaUrl, STREAM_STATE } from '../../utils/constants';

export default function StationList({ variant = 'grid' }) {
  const {
    stations,
    stationsLoading,
    stationsError,
    currentStation,
    radioState,
    playStation,
    pauseRadio,
  } = usePlayer();

  if (stationsLoading) return <ListSkeleton rows={3} />;
  if (stationsError) return <ErrorState message={stationsError} />;
  if (!stations.length) {
    return (
      <EmptyState
        icon="radio"
        title="No stations configured"
        description="An administrator can add Icecast or SHOUTcast stream URLs from the dashboard."
      />
    );
  }

  const onToggle = (station) => {
    const isActive = currentStation?.id === station.id;
    if (isActive && (radioState === STREAM_STATE.PLAYING || radioState === STREAM_STATE.LOADING)) {
      pauseRadio();
    } else {
      playStation(station);
    }
  };

  return (
    <div
      className={classNames(
        variant === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-2'
      )}
    >
      {stations.map((station) => {
        const isActive = currentStation?.id === station.id;
        const isPlaying = isActive && radioState === STREAM_STATE.PLAYING;
        const isLoading = isActive && radioState === STREAM_STATE.LOADING;
        const isError = isActive && radioState === STREAM_STATE.ERROR;

        return (
          <button
            key={station.id}
            type="button"
            onClick={() => onToggle(station)}
            aria-pressed={isPlaying}
            className={classNames(
              'group flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition-all',
              isActive
                ? 'border-primary/40 bg-primary/10'
                : 'border-line bg-surface-container-low hover:border-primary/25 hover:bg-surface-container'
            )}
          >
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-container-high">
              {station.logo_url ? (
                <img src={mediaUrl(station.logo_url)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center">
                  <Icon name="radio" size={26} className="text-outline-variant" />
                </span>
              )}
              <span
                className={classNames(
                  'absolute inset-0 flex items-center justify-center bg-black/55 transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
              >
                {isLoading ? (
                  <Spinner size={20} className="text-white" />
                ) : (
                  <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={26} filled className="text-white" />
                )}
              </span>
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-on-surface">{station.name}</span>
                {station.is_live && (
                  <span className="badge-live shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
                    Live
                  </span>
                )}
              </span>
              {station.genre && (
                <span className="mt-0.5 block truncate text-xs text-primary">{station.genre}</span>
              )}
              {station.description && (
                <span className="mt-1 line-clamp-2 block text-xs text-on-surface-variant">
                  {station.description}
                </span>
              )}
              {isError && (
                <span className="mt-1 block text-xs text-error">
                  This stream is not responding. Try another station.
                </span>
              )}
            </span>

            {isPlaying && (
              <span className="equaliser shrink-0 text-primary" aria-hidden="true">
                <span /><span /><span /><span />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

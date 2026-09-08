import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { Spinner } from '../common/Loader';
import { usePlayer } from '../../hooks/usePlayer';
import { STREAM_STATE } from '../../utils/constants';

/** Compact home-rail widget for the flagship stream. */
export default function RadioWidget() {
  const {
    stations,
    stationsLoading,
    currentStation,
    radioState,
    nowPlaying,
    playStation,
    pauseRadio,
    isRadioPlaying,
  } = usePlayer();

  const station = currentStation || stations[0];

  return (
    <section className="panel sheen relative overflow-hidden p-4">
      {/* Soft tint rather than a heavy gradient block. */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />

      <div className="relative flex items-center justify-between gap-2">
        <span className="badge-live">
          <span className="h-1 w-1 rounded-full bg-live animate-pulse-live" />
          On air
        </span>
        <Link to="/radio" className="text-[0.75rem] font-medium text-primary hover:opacity-80">
          All stations
        </Link>
      </div>

      {stationsLoading ? (
        <div className="relative mt-3 space-y-2">
          <div className="skeleton h-4 w-28" />
          <div className="skeleton h-3 w-20" />
        </div>
      ) : !station ? (
        <p className="relative mt-3 text-[0.8125rem] text-fg-muted">No stations configured yet.</p>
      ) : (
        <div className="relative mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => (isRadioPlaying ? pauseRadio() : playStation(station))}
            aria-label={isRadioPlaying ? 'Pause the live stream' : 'Play the live stream'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg shadow-glow transition-transform duration-200 ease-apple hover:scale-105 active:scale-95"
          >
            {radioState === STREAM_STATE.LOADING ? (
              <Spinner size={18} />
            ) : (
              <Icon name={isRadioPlaying ? 'pause' : 'play_arrow'} size={22} filled />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-headline-sm text-fg">{station.name}</p>
            <p className="mt-0.5 truncate text-[0.75rem] text-fg-muted">
              {nowPlaying?.title || station.genre || 'Live broadcast'}
            </p>
          </div>

          {isRadioPlaying && (
            <span className="equaliser shrink-0 text-primary" aria-hidden="true">
              <span /><span /><span /><span />
            </span>
          )}
        </div>
      )}
    </section>
  );
}

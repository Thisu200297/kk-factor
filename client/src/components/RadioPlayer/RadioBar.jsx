import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { Spinner } from '../common/Loader';
import ProgressBar from '../MusicPlayer/ProgressBar';
import PlayerControls from '../MusicPlayer/PlayerControls';
import VolumeSlider from '../MusicPlayer/VolumeSlider';
import { usePlayer } from '../../hooks/usePlayer';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { classNames } from '../../utils/format';
import CoverImage from '../common/CoverImage';
import { mediaUrl, PLAYER_SOURCE, STREAM_STATE } from '../../utils/constants';

/**
 * The persistent bottom bar. It is always mounted, so playback survives every
 * route change. It shows the music transport when a track is loaded and the
 * radio transport otherwise; on mobile it collapses to a single-row
 * mini-player that expands into a full sheet.
 */
export default function RadioBar() {
  const {
    activeSource,
    currentStation,
    currentTrack,
    radioState,
    nowPlaying,
    toggleRadio,
    isRadioPlaying,
    isMusicPlaying,
    musicState,
    toggleMusic,
    stations,
  } = usePlayer();

  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();

  const musicMode = activeSource === PLAYER_SOURCE.MUSIC && currentTrack;
  const hasSomething = musicMode || currentStation || stations.length > 0;

  if (!hasSomething) return null;

  const title = musicMode ? currentTrack.title : currentStation?.name || stations[0]?.name || 'Live radio';
  const subtitle = musicMode
    ? currentTrack.artist
    : nowPlaying?.title || currentStation?.genre || 'Tap play to tune in';

  const artwork = musicMode ? mediaUrl(currentTrack.cover_url) : mediaUrl(currentStation?.logo_url);

  const busy = musicMode ? musicState === STREAM_STATE.LOADING : radioState === STREAM_STATE.LOADING;
  const playing = musicMode ? isMusicPlaying : isRadioPlaying;
  const onTogglePlay = musicMode ? toggleMusic : toggleRadio;

  const errored = musicMode ? musicState === STREAM_STATE.ERROR : radioState === STREAM_STATE.ERROR;

  return (
    <>
      {/* Mobile expanded sheet */}
      {isMobile && expanded && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-background p-6 pb-24 animate-fade-up">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="btn-icon self-start"
            aria-label="Collapse player"
          >
            <Icon name="keyboard_arrow_down" size={28} />
          </button>

          <div className="mx-auto mt-6 w-full max-w-xs">
            <CoverImage
              src={artwork}
              seed={musicMode ? currentTrack?.id : currentStation?.id || 'radio'}
              zoomOnHover={false}
              rounded="rounded-panel"
              className="aspect-square w-full shadow-pop"
            />
          </div>

          <div className="mt-8 text-center">
            <h2 className="truncate text-xl font-bold text-on-surface">{title}</h2>
            <p className="mt-1 truncate text-sm text-on-surface-variant">{subtitle}</p>
            {!musicMode && (
              <span className="badge-live mt-3 inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
                Live
              </span>
            )}
          </div>

          <div className="mt-8">
            {musicMode ? (
              <>
                <ProgressBar />
                <div className="mt-6 flex justify-center">
                  <PlayerControls size="lg" />
                </div>
              </>
            ) : (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onTogglePlay}
                  aria-label={playing ? 'Pause' : 'Play'}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary"
                >
                  {busy ? <Spinner size={26} /> : <Icon name={playing ? 'pause' : 'play_arrow'} size={36} filled />}
                </button>
              </div>
            )}

            <div className="mt-8 flex justify-center">
              <VolumeSlider />
            </div>
          </div>
        </div>
      )}

      {/* Persistent bar */}
      <div
        className={classNames(
          'fixed inset-x-0 bottom-0 z-[80] glass border-t',
          'h-player-bar-mobile md:h-player-bar',
          'pb-[env(safe-area-inset-bottom,0px)]'
        )}
      >
        <div className="container-page flex h-full items-center gap-3 md:gap-5">
          {/* Now playing */}
          <button
            type="button"
            onClick={() => isMobile && setExpanded(true)}
            className={classNames(
              'flex min-w-0 flex-1 items-center gap-3 text-left md:flex-none md:w-1/4',
              isMobile ? 'cursor-pointer' : 'cursor-default'
            )}
            aria-label={isMobile ? 'Expand player' : undefined}
          >
            <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-lg md:h-11 md:w-11">
              <CoverImage
                src={artwork}
                seed={musicMode ? currentTrack?.id : currentStation?.id || 'radio'}
                zoomOnHover={false}
                className="h-full w-full"
              />
              {!musicMode && playing && (
                <span className="absolute inset-x-0 bottom-0 h-1 bg-live" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-on-surface">{title}</span>
                {!musicMode && (
                  <span className="hidden shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-live xs:inline-flex">
                    <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
                    Live
                  </span>
                )}
              </span>
              <span
                className={classNames(
                  'block truncate text-xs',
                  errored ? 'text-error' : 'text-on-surface-variant'
                )}
              >
                {errored ? 'Stream unavailable — try another source' : subtitle}
              </span>
            </span>
          </button>

          {/* Transport */}
          <div className="flex shrink-0 flex-col items-center gap-1 md:flex-1">
            {musicMode ? (
              <>
                <PlayerControls />
                <div className="hidden w-full max-w-xl md:block">
                  <ProgressBar />
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={playing ? 'Pause the live stream' : 'Play the live stream'}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary transition-transform hover:scale-105 active:scale-95 md:h-12 md:w-12"
              >
                {busy ? <Spinner size={18} /> : <Icon name={playing ? 'pause' : 'play_arrow'} size={26} filled />}
              </button>
            )}
          </div>

          {/* Right-hand controls (desktop only) */}
          <div className="hidden items-center justify-end gap-2 md:flex md:w-1/4">
            <Link to={musicMode ? '/music' : '/radio'} className="btn-icon" aria-label="Open the full player">
              <Icon name={musicMode ? 'queue_music' : 'radio'} size={20} />
            </Link>
            <VolumeSlider />
          </div>

          {/* Mobile expand affordance */}
          {isMobile && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="btn-icon !h-8 !w-8 shrink-0"
              aria-label="Expand player"
            >
              <Icon name="keyboard_arrow_up" size={20} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

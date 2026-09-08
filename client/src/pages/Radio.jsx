import StationList from '../components/RadioPlayer/StationList';
import Icon from '../components/common/Icon';
import { Spinner } from '../components/common/Loader';
import VolumeSlider from '../components/MusicPlayer/VolumeSlider';
import { usePlayer } from '../hooks/usePlayer';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { mediaUrl, STREAM_STATE } from '../utils/constants';

export default function Radio() {
  useDocumentTitle('Live Radio');

  const {
    currentStation,
    radioState,
    nowPlaying,
    toggleRadio,
    isRadioPlaying,
    stations,
  } = usePlayer();

  const station = currentStation || stations[0];
  const loading = radioState === STREAM_STATE.LOADING;
  const errored = radioState === STREAM_STATE.ERROR;

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-8">
        <h1 className="text-headline-lg">Live radio</h1>
        <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
          Streaming over the HTML5 Audio API straight from the station&apos;s Icecast/SHOUTcast
          endpoint. Playback keeps running while you read — the bar at the bottom follows you
          around the site.
        </p>
      </header>

      {/* Now playing panel */}
      {station && (
        <section className="panel sheen relative mb-8 overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />
          <div className="relative flex flex-col gap-5 p-5 md:flex-row md:items-center md:p-7">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-panel bg-surface-2 shadow-lift md:h-36 md:w-36">
              {station.logo_url ? (
                <img src={mediaUrl(station.logo_url)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Icon name="radio" size={40} className="text-fg-subtle/50" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {station.is_live && (
                  <span className="badge-live">
                    <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
                    On air
                  </span>
                )}
                {station.genre && <span className="badge-category">{station.genre}</span>}
              </div>

              <h2 className="text-headline-md">{station.name}</h2>

              <p className="mt-1 text-sm text-on-surface-variant">
                {errored
                  ? 'This stream is not responding right now. Pick another station below.'
                  : nowPlaying?.title
                    ? `Now playing: ${nowPlaying.title}`
                    : station.description || 'Live broadcast'}
              </p>

              {nowPlaying?.listeners != null && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-on-surface-variant">
                  <Icon name="headphones" size={14} />
                  {nowPlaying.listeners} listening now
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={toggleRadio}
                  className="flex h-13 w-13 items-center justify-center rounded-full bg-primary p-3.5 text-primary-fg shadow-glow transition-transform duration-200 ease-apple hover:scale-105 active:scale-95"
                  aria-label={isRadioPlaying ? 'Pause the live stream' : 'Play the live stream'}
                >
                  {loading ? <Spinner size={22} /> : <Icon name={isRadioPlaying ? 'pause' : 'play_arrow'} size={32} filled />}
                </button>

                {isRadioPlaying && (
                  <span className="equaliser text-primary" aria-hidden="true">
                    <span /><span /><span /><span />
                  </span>
                )}

                {loading && <span className="text-xs text-on-surface-variant">Buffering the stream…</span>}

                <VolumeSlider className="ml-auto" />
              </div>
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-headline-md">All stations</h2>
        <StationList variant="grid" />
      </section>
    </div>
  );
}

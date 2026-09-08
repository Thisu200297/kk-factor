import { useCallback, useMemo, useState } from 'react';
import PlaylistSidebar from '../components/MusicPlayer/PlaylistSidebar';
import TrackList from '../components/MusicPlayer/TrackList';
import QueuePanel from '../components/MusicPlayer/QueuePanel';
import PlayerControls from '../components/MusicPlayer/PlayerControls';
import ProgressBar from '../components/MusicPlayer/ProgressBar';
import VolumeSlider from '../components/MusicPlayer/VolumeSlider';
import Icon from '../components/common/Icon';
import { ListSkeleton } from '../components/common/Loader';
import { EmptyState, ErrorState } from '../components/common/States';
import { useFetch } from '../hooks/useFetch';
import { usePlayer } from '../hooks/usePlayer';
import { useDebounce } from '../hooks/useDebounce';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { playlistsApi, tracksApi } from '../utils/api';
import CoverImage from '../components/common/CoverImage';
import { mediaUrl } from '../utils/constants';
import { classNames, formatDuration } from '../utils/format';

export default function Music() {
  useDocumentTitle('Music');

  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [tab, setTab] = useState('tracks');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { playQueue, currentTrack, queue } = usePlayer();

  const fetchPlaylists = useCallback(() => playlistsApi.list(), []);
  const playlists = useFetch(fetchPlaylists);

  const fetchTracks = useCallback(
    () => tracksApi.list({ q: debouncedQuery || undefined, limit: 200 }),
    [debouncedQuery]
  );
  const tracks = useFetch(fetchTracks);

  const visibleTracks = useMemo(() => {
    if (selectedPlaylist) return selectedPlaylist.tracks || [];
    return tracks.data?.items || [];
  }, [selectedPlaylist, tracks.data]);

  const totalSeconds = useMemo(
    () => visibleTracks.reduce((sum, t) => sum + (t.duration || 0), 0),
    [visibleTracks]
  );

  const heading = selectedPlaylist ? selectedPlaylist.name : 'All tracks';
  const cover = selectedPlaylist
    ? mediaUrl(selectedPlaylist.cover_url) || mediaUrl(visibleTracks[0]?.cover_url)
    : mediaUrl(currentTrack?.cover_url);

  const startAt = (index) => playQueue(visibleTracks, index);

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-headline-lg">Music</h1>
        <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
          On-demand playback with shuffle, repeat, a seekable progress bar and a queue you control.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-10rem)] lg:self-start">
          <PlaylistSidebar
            playlists={playlists.data?.items || []}
            loading={playlists.loading}
            selectedId={selectedPlaylist?.id ?? null}
            onSelect={setSelectedPlaylist}
            onSelectLibrary={() => setSelectedPlaylist(null)}
          />
        </div>

        <div className="min-w-0">
          {/* Now playing hero */}
          <section className="panel sheen relative mb-5 flex flex-col gap-5 overflow-hidden p-5 sm:flex-row sm:items-center">
            <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-accent/12 blur-3xl" />
            <CoverImage
              src={cover}
              seed={currentTrack?.id || selectedPlaylist?.slug || 'library'}
              zoomOnHover={false}
              rounded="rounded-panel"
              className="relative h-24 w-24 shrink-0 shadow-lift sm:h-28 sm:w-28"
            />

            <div className="relative min-w-0 flex-1">
              <p className="text-label-md uppercase text-fg-subtle">
                {currentTrack ? 'Now playing' : heading}
              </p>
              <h2 className="mt-1 truncate text-headline-md">
                {currentTrack ? currentTrack.title : heading}
              </h2>
              <p className="mt-0.5 truncate text-sm text-on-surface-variant">
                {currentTrack
                  ? `${currentTrack.artist}${currentTrack.album ? ` · ${currentTrack.album}` : ''}`
                  : `${visibleTracks.length} track${visibleTracks.length === 1 ? '' : 's'} · ${formatDuration(totalSeconds)}`}
              </p>

              <div className="mt-4 space-y-3">
                <ProgressBar />
                <div className="flex flex-wrap items-center gap-4">
                  <PlayerControls size="lg" />
                  <VolumeSlider className="ml-auto" />
                </div>
              </div>
            </div>
          </section>

          {/* Tabs + search */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex rounded-full bg-surface-container-high p-1">
              {[
                { id: 'tracks', label: 'Tracks', icon: 'queue_music' },
                { id: 'queue', label: `Queue${queue.length ? ` (${queue.length})` : ''}`, icon: 'playlist_play' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={classNames(
                    'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                    tab === item.id ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                </button>
              ))}
            </div>

            {tab === 'tracks' && !selectedPlaylist && (
              <div className="relative ml-auto w-full sm:w-64">
                <Icon
                  name="search"
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter tracks…"
                  aria-label="Filter tracks"
                  className="input pl-9"
                />
              </div>
            )}

            {tab === 'tracks' && visibleTracks.length > 0 && (
              <button type="button" onClick={() => startAt(0)} className="btn-primary">
                <Icon name="play_arrow" size={18} filled />
                Play all
              </button>
            )}
          </div>

          {/* Content */}
          <section className="card overflow-hidden p-1 md:p-2">
            {tab === 'queue' ? (
              <div className="p-2">
                <QueuePanel />
              </div>
            ) : tracks.loading && !selectedPlaylist ? (
              <div className="p-4">
                <ListSkeleton rows={6} />
              </div>
            ) : tracks.error && !selectedPlaylist ? (
              <div className="p-4">
                <ErrorState message={tracks.error} onRetry={tracks.refetch} />
              </div>
            ) : visibleTracks.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon="music_note"
                  title={query ? `No tracks match “${query}”` : 'The library is empty'}
                  description={
                    query
                      ? 'Try a different search term.'
                      : 'An administrator can upload MP3 or WAV files from the dashboard.'
                  }
                />
              </div>
            ) : (
              <TrackList tracks={visibleTracks} onPlay={startAt} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

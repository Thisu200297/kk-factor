import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { mediaUrl, PLAYER_SOURCE, REPEAT_MODES, STREAM_STATE } from '../utils/constants';
import { radioApi, tracksApi } from '../utils/api';

export const PlayerContext = createContext(null);

const VOLUME_KEY = 'kk_volume';

/**
 * Owns the app's audio.
 *
 * Two HTMLAudioElements are held for the lifetime of the app: one for live
 * radio, one for on-demand music. They are mutually exclusive — starting one
 * pauses the other — which is what makes the persistent bottom bar behave
 * predictably when the user moves between the radio and music pages.
 *
 * Keeping the elements outside the React tree means navigation never unmounts
 * them, so playback survives route changes.
 */
export function PlayerProvider({ children }) {
  const radioRef = useRef(null);
  const musicRef = useRef(null);
  if (!radioRef.current && typeof Audio !== 'undefined') {
    radioRef.current = new Audio();
    radioRef.current.preload = 'none';
    // Live streams must never be cached or seeked.
    radioRef.current.crossOrigin = 'anonymous';
  }
  if (!musicRef.current && typeof Audio !== 'undefined') {
    musicRef.current = new Audio();
    musicRef.current.preload = 'metadata';
  }

  /* --- Shared --------------------------------------------------------- */
  const [activeSource, setActiveSource] = useState(PLAYER_SOURCE.NONE);
  const [volume, setVolumeState] = useState(() => {
    try {
      const stored = Number.parseFloat(localStorage.getItem(VOLUME_KEY));
      return Number.isFinite(stored) ? Math.min(1, Math.max(0, stored)) : 0.8;
    } catch {
      return 0.8;
    }
  });
  const [muted, setMuted] = useState(false);

  /* --- Radio ---------------------------------------------------------- */
  const [stations, setStations] = useState([]);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [stationsError, setStationsError] = useState(null);
  const [currentStation, setCurrentStation] = useState(null);
  const [radioState, setRadioState] = useState(STREAM_STATE.IDLE);
  const [nowPlaying, setNowPlaying] = useState(null);

  /* --- Music ---------------------------------------------------------- */
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [musicState, setMusicState] = useState(STREAM_STATE.IDLE);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(REPEAT_MODES.OFF);
  // Preserves the original order so switching shuffle off restores it.
  const orderedQueueRef = useRef([]);

  const currentTrack = queueIndex >= 0 ? queue[queueIndex] || null : null;

  /* --- Volume propagation --------------------------------------------- */
  useEffect(() => {
    [radioRef.current, musicRef.current].forEach((el) => {
      if (!el) return;
      el.volume = volume;
      el.muted = muted;
    });
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      /* ignore */
    }
  }, [volume, muted]);

  const setVolume = useCallback((value) => {
    const clamped = Math.min(1, Math.max(0, value));
    setVolumeState(clamped);
    if (clamped > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  /* --- Load stations once --------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    radioApi
      .streams()
      .then(({ items }) => {
        if (cancelled) return;
        setStations(items);
        setStationsError(null);
      })
      .catch((err) => {
        if (!cancelled) setStationsError(err.message);
      })
      .finally(() => {
        if (!cancelled) setStationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* --- Radio element events ------------------------------------------- */
  useEffect(() => {
    const el = radioRef.current;
    if (!el) return undefined;

    const onWaiting = () => setRadioState(STREAM_STATE.LOADING);
    const onPlaying = () => setRadioState(STREAM_STATE.PLAYING);
    const onPause = () => setRadioState((s) => (s === STREAM_STATE.ERROR ? s : STREAM_STATE.PAUSED));
    const onError = () => setRadioState(STREAM_STATE.ERROR);

    el.addEventListener('waiting', onWaiting);
    el.addEventListener('loadstart', onWaiting);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('pause', onPause);
    el.addEventListener('error', onError);
    el.addEventListener('stalled', onWaiting);

    return () => {
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('loadstart', onWaiting);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('error', onError);
      el.removeEventListener('stalled', onWaiting);
    };
  }, []);

  /* --- Now Playing polling -------------------------------------------- */
  useEffect(() => {
    if (!currentStation || radioState !== STREAM_STATE.PLAYING) {
      setNowPlaying(null);
      return undefined;
    }

    let cancelled = false;
    const fetchMeta = () => {
      radioApi
        .nowPlaying(currentStation.id)
        .then((meta) => {
          if (!cancelled) setNowPlaying(meta?.title ? meta : null);
        })
        .catch(() => {
          /* metadata is optional — never surface a failure to the listener */
        });
    };

    fetchMeta();
    const timer = setInterval(fetchMeta, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [currentStation, radioState]);

  /* --- Music element events ------------------------------------------- */
  const advanceRef = useRef(() => {});

  useEffect(() => {
    const el = musicRef.current;
    if (!el) return undefined;

    const onTime = () => setProgress(el.currentTime);
    const onMeta = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onPlaying = () => setMusicState(STREAM_STATE.PLAYING);
    const onWaiting = () => setMusicState(STREAM_STATE.LOADING);
    const onPause = () => setMusicState((s) => (s === STREAM_STATE.ERROR ? s : STREAM_STATE.PAUSED));
    const onError = () => setMusicState(STREAM_STATE.ERROR);
    const onEnded = () => advanceRef.current();

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('durationchange', onMeta);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('pause', onPause);
    el.addEventListener('error', onError);
    el.addEventListener('ended', onEnded);

    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('durationchange', onMeta);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('error', onError);
      el.removeEventListener('ended', onEnded);
    };
  }, []);

  /* --- Radio controls -------------------------------------------------- */
  const stopMusic = useCallback(() => {
    const el = musicRef.current;
    if (el && !el.paused) el.pause();
  }, []);

  const playStation = useCallback(
    async (station) => {
      const el = radioRef.current;
      if (!el || !station) return;

      stopMusic();
      setActiveSource(PLAYER_SOURCE.RADIO);

      // Reassigning src is what forces a reconnect to a live stream.
      if (currentStation?.id !== station.id || !el.src) {
        el.src = station.stream_url;
        el.load();
        setCurrentStation(station);
      }

      setRadioState(STREAM_STATE.LOADING);
      try {
        await el.play();
      } catch (err) {
        // Autoplay policy blocks playback until a user gesture — that is not
        // a stream failure, so keep the UI in a paused rather than error state.
        setRadioState(err?.name === 'NotAllowedError' ? STREAM_STATE.PAUSED : STREAM_STATE.ERROR);
      }
    },
    [currentStation, stopMusic]
  );

  const pauseRadio = useCallback(() => {
    const el = radioRef.current;
    if (!el) return;
    el.pause();
    // Dropping the source releases the socket instead of buffering silently.
    el.removeAttribute('src');
    el.load();
    setRadioState(STREAM_STATE.PAUSED);
  }, []);

  const toggleRadio = useCallback(() => {
    if (radioState === STREAM_STATE.PLAYING || radioState === STREAM_STATE.LOADING) {
      pauseRadio();
    } else if (currentStation) {
      playStation(currentStation);
    } else if (stations.length) {
      playStation(stations[0]);
    }
  }, [radioState, currentStation, stations, pauseRadio, playStation]);

  /* --- Music controls -------------------------------------------------- */
  const loadTrackAt = useCallback(
    async (list, index, autoplay = true) => {
      const el = musicRef.current;
      const track = list[index];
      if (!el || !track) return;

      const el2 = radioRef.current;
      if (el2 && !el2.paused) pauseRadio();

      setActiveSource(PLAYER_SOURCE.MUSIC);
      el.src = mediaUrl(track.file_url);
      el.load();
      setProgress(0);
      setDuration(track.duration || 0);

      if (autoplay) {
        setMusicState(STREAM_STATE.LOADING);
        try {
          await el.play();
          tracksApi.registerPlay(track.id);
        } catch (err) {
          setMusicState(err?.name === 'NotAllowedError' ? STREAM_STATE.PAUSED : STREAM_STATE.ERROR);
        }
      }
    },
    [pauseRadio]
  );

  /** Starts a list of tracks at `startIndex`, replacing the queue. */
  const playQueue = useCallback(
    (tracks, startIndex = 0) => {
      if (!tracks?.length) return;
      orderedQueueRef.current = tracks;

      let list = tracks;
      let index = startIndex;

      if (shuffle) {
        const chosen = tracks[startIndex];
        const rest = tracks.filter((_, i) => i !== startIndex);
        for (let i = rest.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        list = [chosen, ...rest];
        index = 0;
      }

      setQueue(list);
      setQueueIndex(index);
      loadTrackAt(list, index, true);
    },
    [shuffle, loadTrackAt]
  );

  const toggleMusic = useCallback(async () => {
    const el = musicRef.current;
    if (!el || !currentTrack) return;

    if (el.paused) {
      const radio = radioRef.current;
      if (radio && !radio.paused) pauseRadio();
      setActiveSource(PLAYER_SOURCE.MUSIC);
      try {
        await el.play();
      } catch {
        setMusicState(STREAM_STATE.PAUSED);
      }
    } else {
      el.pause();
    }
  }, [currentTrack, pauseRadio]);

  const playNext = useCallback(
    (auto = false) => {
      if (!queue.length) return;

      if (auto && repeat === REPEAT_MODES.ONE) {
        loadTrackAt(queue, queueIndex, true);
        return;
      }

      const next = queueIndex + 1;
      if (next < queue.length) {
        setQueueIndex(next);
        loadTrackAt(queue, next, true);
      } else if (repeat === REPEAT_MODES.ALL) {
        setQueueIndex(0);
        loadTrackAt(queue, 0, true);
      } else {
        setMusicState(STREAM_STATE.PAUSED);
        setProgress(0);
      }
    },
    [queue, queueIndex, repeat, loadTrackAt]
  );

  // Keeps the `ended` listener pointing at the current closure.
  useEffect(() => {
    advanceRef.current = () => playNext(true);
  }, [playNext]);

  const playPrevious = useCallback(() => {
    const el = musicRef.current;
    if (!el || !queue.length) return;

    // Standard player behaviour: restart the track unless we are near the top.
    if (el.currentTime > 3) {
      el.currentTime = 0;
      return;
    }

    const prev = queueIndex - 1;
    if (prev >= 0) {
      setQueueIndex(prev);
      loadTrackAt(queue, prev, true);
    } else {
      el.currentTime = 0;
    }
  }, [queue, queueIndex, loadTrackAt]);

  const seek = useCallback((seconds) => {
    const el = musicRef.current;
    if (!el || !Number.isFinite(seconds)) return;
    el.currentTime = Math.max(0, Math.min(seconds, el.duration || seconds));
    setProgress(el.currentTime);
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((on) => {
      const next = !on;
      if (!next && orderedQueueRef.current.length) {
        // Restore the original order, keeping the current track selected.
        const playing = queue[queueIndex];
        const restored = orderedQueueRef.current;
        setQueue(restored);
        setQueueIndex(Math.max(0, restored.findIndex((t) => t.id === playing?.id)));
      }
      return next;
    });
  }, [queue, queueIndex]);

  const cycleRepeat = useCallback(() => {
    setRepeat((mode) => {
      if (mode === REPEAT_MODES.OFF) return REPEAT_MODES.ALL;
      if (mode === REPEAT_MODES.ALL) return REPEAT_MODES.ONE;
      return REPEAT_MODES.OFF;
    });
  }, []);

  /** Appends a track to the end of the queue without interrupting playback. */
  const enqueue = useCallback((track) => {
    setQueue((q) => {
      if (q.some((t) => t.id === track.id)) return q;
      const next = [...q, track];
      orderedQueueRef.current = next;
      return next;
    });
  }, []);

  const removeFromQueue = useCallback(
    (trackId) => {
      setQueue((q) => {
        const index = q.findIndex((t) => t.id === trackId);
        if (index === -1) return q;
        const next = q.filter((t) => t.id !== trackId);
        orderedQueueRef.current = next;
        if (index < queueIndex) setQueueIndex((i) => i - 1);
        return next;
      });
    },
    [queueIndex]
  );

  const jumpTo = useCallback(
    (index) => {
      if (index < 0 || index >= queue.length) return;
      setQueueIndex(index);
      loadTrackAt(queue, index, true);
    },
    [queue, loadTrackAt]
  );

  const value = useMemo(
    () => ({
      // shared
      activeSource,
      volume,
      muted,
      setVolume,
      toggleMute,
      // radio
      stations,
      stationsLoading,
      stationsError,
      currentStation,
      radioState,
      nowPlaying,
      playStation,
      pauseRadio,
      toggleRadio,
      isRadioPlaying: radioState === STREAM_STATE.PLAYING,
      isRadioLoading: radioState === STREAM_STATE.LOADING,
      // music
      queue,
      queueIndex,
      currentTrack,
      musicState,
      progress,
      duration,
      shuffle,
      repeat,
      playQueue,
      toggleMusic,
      playNext,
      playPrevious,
      seek,
      toggleShuffle,
      cycleRepeat,
      enqueue,
      removeFromQueue,
      jumpTo,
      isMusicPlaying: musicState === STREAM_STATE.PLAYING,
    }),
    [
      activeSource, volume, muted, setVolume, toggleMute,
      stations, stationsLoading, stationsError, currentStation, radioState, nowPlaying,
      playStation, pauseRadio, toggleRadio,
      queue, queueIndex, currentTrack, musicState, progress, duration, shuffle, repeat,
      playQueue, toggleMusic, playNext, playPrevious, seek, toggleShuffle, cycleRepeat,
      enqueue, removeFromQueue, jumpTo,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

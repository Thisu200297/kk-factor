import { useCallback, useRef, useState } from 'react';
import Icon from '../common/Icon';
import Modal, { ConfirmDialog } from '../common/Modal';
import { ListSkeleton, Spinner } from '../common/Loader';
import { EmptyState, ErrorState, InlineError } from '../common/States';
import { useToast } from '../common/Toast';
import { useFetch } from '../../hooks/useFetch';
import { tracksApi } from '../../utils/api';
import { formatDuration } from '../../utils/format';
import CoverImage from '../common/CoverImage';
import { mediaUrl } from '../../utils/constants';

const ACCEPTED_AUDIO = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'];
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const EMPTY = { title: '', artist: '', album: '', genre: '' };

export default function MusicLibrary() {
  const toast = useToast();
  const audioInput = useRef(null);
  const coverInput = useRef(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [duration, setDuration] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetcher = useCallback(() => tracksApi.list({ limit: 200 }), []);
  const tracks = useFetch(fetcher);

  const reset = () => {
    setForm(EMPTY);
    setAudioFile(null);
    setCoverFile(null);
    setDuration(0);
    setError(null);
    if (audioInput.current) audioInput.current.value = '';
    if (coverInput.current) coverInput.current.value = '';
  };

  /** Reads duration client-side so the list shows a real length immediately. */
  const onAudioChosen = (file) => {
    if (!file) return;
    if (!ACCEPTED_AUDIO.includes(file.type)) {
      setError('Only MP3 and WAV files are accepted.');
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      setError('That file is larger than the 25 MB limit.');
      return;
    }

    setError(null);
    setAudioFile(file);
    if (!form.title) setForm((f) => ({ ...f, title: file.name.replace(/\.[^.]+$/, '') }));

    const probe = new Audio();
    const objectUrl = URL.createObjectURL(file);
    probe.addEventListener('loadedmetadata', () => {
      setDuration(Number.isFinite(probe.duration) ? Math.round(probe.duration) : 0);
      URL.revokeObjectURL(objectUrl);
    });
    probe.addEventListener('error', () => URL.revokeObjectURL(objectUrl));
    probe.src = objectUrl;
  };

  const onUpload = async () => {
    setError(null);
    if (!audioFile) {
      setError('Choose an audio file to upload.');
      return;
    }
    if (!form.title.trim()) {
      setError('Give the track a title.');
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      data.append('audio', audioFile);
      if (coverFile) data.append('cover', coverFile);
      data.append('title', form.title.trim());
      data.append('artist', form.artist.trim() || 'Unknown Artist');
      if (form.album.trim()) data.append('album', form.album.trim());
      if (form.genre.trim()) data.append('genre', form.genre.trim());
      data.append('duration', String(duration));

      await tracksApi.create(data);
      toast.success('Track uploaded');
      setOpen(false);
      reset();
      tracks.refetch();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await tracksApi.remove(pendingDelete.id);
      toast.success('Track deleted');
      setPendingDelete(null);
      tracks.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const items = tracks.data?.items || [];

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-headline-md font-bold">Music library</h2>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(true);
          }}
          className="btn-primary ml-auto"
        >
          <Icon name="upload" size={18} />
          Upload track
        </button>
      </header>

      {tracks.loading ? (
        <div className="card p-5"><ListSkeleton rows={6} /></div>
      ) : tracks.error ? (
        <ErrorState message={tracks.error} onRetry={tracks.refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="library_music"
          title="No tracks yet"
          description="Upload MP3 or WAV files to build the on-demand library."
        />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((track) => (
              <li key={track.id} className="flex items-center gap-3 p-3 md:p-4">
                <CoverImage
                  src={mediaUrl(track.cover_url)}
                  seed={`${track.artist}-${track.id}`}
                  zoomOnHover={false}
                  rounded="rounded-lg"
                  className="h-11 w-11 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-on-surface">{track.title}</p>
                  <p className="truncate text-xs text-on-surface-variant">
                    {track.artist}
                    {track.album ? ` · ${track.album}` : ''}
                    {track.genre ? ` · ${track.genre}` : ''}
                  </p>
                </div>
                <span className="hidden shrink-0 text-xs tabular-nums text-on-surface-variant sm:block">
                  {formatDuration(track.duration)}
                </span>
                <span className="hidden shrink-0 items-center gap-1 text-xs text-on-surface-variant md:flex">
                  <Icon name="play_arrow" size={14} />
                  {track.plays}
                </span>
                <button
                  type="button"
                  onClick={() => setPendingDelete(track)}
                  className="btn-icon shrink-0 hover:text-error"
                  aria-label={`Delete ${track.title}`}
                >
                  <Icon name="delete" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Upload a track"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</button>
            <button type="button" className="btn-primary" onClick={onUpload} disabled={saving}>
              {saving ? <Spinner size={16} /> : <Icon name="upload" size={18} />}
              {saving ? 'Uploading…' : 'Upload'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => audioInput.current?.click()}
            className="flex w-full items-center gap-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon name={audioFile ? 'audio_file' : 'add'} size={24} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-on-surface">
                {audioFile ? audioFile.name : 'Choose an audio file'}
              </span>
              <span className="block text-xs text-on-surface-variant">
                {audioFile
                  ? `${(audioFile.size / 1024 / 1024).toFixed(1)} MB${duration ? ` · ${formatDuration(duration)}` : ''}`
                  : 'MP3 or WAV, up to 25 MB'}
              </span>
            </span>
          </button>
          <input
            ref={audioInput}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,.mp3,.wav"
            className="hidden"
            onChange={(event) => onAudioChosen(event.target.files?.[0])}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="track-title">Title</label>
              <input
                id="track-title" className="input" value={form.title}
                onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="track-artist">Artist</label>
              <input
                id="track-artist" className="input" value={form.artist}
                placeholder="Unknown Artist"
                onChange={(event) => setForm((f) => ({ ...f, artist: event.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="track-album">Album</label>
              <input
                id="track-album" className="input" value={form.album}
                onChange={(event) => setForm((f) => ({ ...f, album: event.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="track-genre">Genre</label>
              <input
                id="track-genre" className="input" value={form.genre}
                onChange={(event) => setForm((f) => ({ ...f, genre: event.target.value }))}
              />
            </div>
          </div>

          <div>
            <span className="label">Cover art (optional)</span>
            <button
              type="button"
              onClick={() => coverInput.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-3 text-left transition-colors hover:border-primary"
            >
              <Icon name="image" size={20} className="text-on-surface-variant" />
              <span className="truncate text-sm text-on-surface-variant">
                {coverFile ? coverFile.name : 'Choose a JPG or PNG'}
              </span>
            </button>
            <input
              ref={coverInput}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(event) => setCoverFile(event.target.files?.[0] || null)}
            />
          </div>

          <InlineError message={error} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={onDelete}
        busy={deleting}
        title="Delete this track?"
        message={`“${pendingDelete?.title}” and its uploaded audio file will be removed permanently.`}
      />
    </section>
  );
}

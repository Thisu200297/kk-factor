import { useCallback, useState } from 'react';
import Icon from '../common/Icon';
import Modal, { ConfirmDialog } from '../common/Modal';
import { ListSkeleton } from '../common/Loader';
import { EmptyState, ErrorState, InlineError } from '../common/States';
import { useToast } from '../common/Toast';
import { useFetch } from '../../hooks/useFetch';
import { playlistsApi, tracksApi } from '../../utils/api';
import { classNames, formatDuration } from '../../utils/format';

const EMPTY = { name: '', description: '', isPublic: true, trackIds: [] };

export default function PlaylistsManager() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlaylists = useCallback(() => playlistsApi.list(), []);
  const playlists = useFetch(fetchPlaylists);

  const fetchTracks = useCallback(() => tracksApi.list({ limit: 200 }), []);
  const tracks = useFetch(fetchTracks);
  const trackOptions = tracks.data?.items || [];

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  };

  const openEdit = (playlist) => {
    setEditing(playlist);
    setForm({
      name: playlist.name,
      description: playlist.description || '',
      isPublic: playlist.is_public,
      trackIds: (playlist.tracks || []).map((t) => t.id),
    });
    setError(null);
    setOpen(true);
  };

  /** Toggling preserves insertion order — that is the playlist's play order. */
  const toggleTrack = (id) => {
    setForm((f) => ({
      ...f,
      trackIds: f.trackIds.includes(id) ? f.trackIds.filter((t) => t !== id) : [...f.trackIds, id],
    }));
  };

  const move = (index, delta) => {
    setForm((f) => {
      const next = [...f.trackIds];
      const target = index + delta;
      if (target < 0 || target >= next.length) return f;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...f, trackIds: next };
    });
  };

  const onSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError('Give the playlist a name.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        isPublic: form.isPublic,
        trackIds: form.trackIds,
      };
      if (editing) await playlistsApi.update(editing.id, payload);
      else await playlistsApi.create(payload);

      toast.success(editing ? 'Playlist updated' : 'Playlist created');
      setOpen(false);
      playlists.refetch();
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
      await playlistsApi.remove(pendingDelete.id);
      toast.success('Playlist deleted');
      setPendingDelete(null);
      playlists.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const items = playlists.data?.items || [];
  const selectedTracks = form.trackIds
    .map((id) => trackOptions.find((t) => t.id === id))
    .filter(Boolean);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-headline-md font-bold">Playlists</h2>
        <button type="button" onClick={openCreate} className="btn-primary ml-auto">
          <Icon name="add" size={18} />
          New playlist
        </button>
      </header>

      {playlists.loading ? (
        <div className="card p-5"><ListSkeleton rows={4} /></div>
      ) : playlists.error ? (
        <ErrorState message={playlists.error} onRetry={playlists.refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="queue_music" title="No playlists" description="Group tracks into playlists for the music page." />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((playlist) => (
              <li key={playlist.id} className="flex items-center gap-3 p-3 md:p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon name="queue_music" size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-on-surface">{playlist.name}</p>
                  <p className="truncate text-xs text-on-surface-variant">
                    {playlist.tracks?.length ?? 0} track{playlist.tracks?.length === 1 ? '' : 's'}
                    {playlist.is_public ? '' : ' · private'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => openEdit(playlist)} className="btn-icon" aria-label="Edit">
                    <Icon name="edit" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(playlist)}
                    className="btn-icon hover:text-error"
                    aria-label="Delete"
                  >
                    <Icon name="delete" size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit playlist' : 'New playlist'}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</button>
            <button type="button" className="btn-primary" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="playlist-name">Name</label>
            <input
              id="playlist-name" className="input" value={form.name}
              onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
            />
          </div>

          <div>
            <label className="label" htmlFor="playlist-description">Description</label>
            <textarea
              id="playlist-description" rows={2} className="input resize-y" value={form.description}
              onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(event) => setForm((f) => ({ ...f, isPublic: event.target.checked }))}
              className="h-4 w-4 rounded accent-primary-container"
            />
            Visible to everyone
          </label>

          {selectedTracks.length > 0 && (
            <div>
              <span className="label">Play order</span>
              <ol className="space-y-1 rounded-xl border border-line p-2">
                {selectedTracks.map((track, index) => (
                  <li key={track.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fill/[0.055]">
                    <span className="w-5 text-xs tabular-nums text-on-surface-variant">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-on-surface">
                      {track.title} <span className="text-on-surface-variant">— {track.artist}</span>
                    </span>
                    <button
                      type="button" onClick={() => move(index, -1)} disabled={index === 0}
                      className="btn-icon !h-7 !w-7" aria-label="Move up"
                    >
                      <Icon name="arrow_upward" size={16} />
                    </button>
                    <button
                      type="button" onClick={() => move(index, 1)} disabled={index === selectedTracks.length - 1}
                      className="btn-icon !h-7 !w-7" aria-label="Move down"
                    >
                      <Icon name="arrow_downward" size={16} />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div>
            <span className="label">Tracks</span>
            {tracks.loading ? (
              <ListSkeleton rows={4} />
            ) : trackOptions.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                Upload tracks in the music library first.
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-line">
                {trackOptions.map((track) => {
                  const selected = form.trackIds.includes(track.id);
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => toggleTrack(track.id)}
                      className={classNames(
                        'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
                        selected ? 'bg-primary/10' : 'hover:bg-fill/[0.055]'
                      )}
                    >
                      <Icon
                        name={selected ? 'check_box' : 'check_box_outline_blank'}
                        size={20}
                        className={selected ? 'text-primary' : 'text-on-surface-variant'}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-on-surface">{track.title}</span>
                        <span className="block truncate text-xs text-on-surface-variant">{track.artist}</span>
                      </span>
                      <span className="text-xs tabular-nums text-on-surface-variant">
                        {formatDuration(track.duration)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <InlineError message={error} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={onDelete}
        busy={deleting}
        title="Delete this playlist?"
        message={`“${pendingDelete?.name}” will be removed. The tracks themselves are not deleted.`}
      />
    </section>
  );
}

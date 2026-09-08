import { useCallback, useState } from 'react';
import Icon from '../common/Icon';
import Modal, { ConfirmDialog } from '../common/Modal';
import { ListSkeleton } from '../common/Loader';
import { EmptyState, ErrorState, InlineError } from '../common/States';
import { useToast } from '../common/Toast';
import { useFetch } from '../../hooks/useFetch';
import { radioApi } from '../../utils/api';
import { classNames } from '../../utils/format';

const EMPTY = {
  name: '',
  streamUrl: '',
  genre: '',
  description: '',
  logoUrl: '',
  metadataUrl: '',
  isLive: true,
  displayOrder: 0,
};

export default function RadioManager() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [testing, setTesting] = useState(null);

  const fetcher = useCallback(() => radioApi.streams(), []);
  const streams = useFetch(fetcher);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  };

  const openEdit = (stream) => {
    setEditing(stream);
    setForm({
      name: stream.name,
      streamUrl: stream.stream_url,
      genre: stream.genre || '',
      description: stream.description || '',
      logoUrl: stream.logo_url || '',
      metadataUrl: stream.metadata_url || '',
      isLive: stream.is_live,
      displayOrder: stream.display_order,
    });
    setError(null);
    setOpen(true);
  };

  /**
   * Quick reachability check: loads the stream into a throwaway Audio element
   * and waits for `canplay`. A failure here usually means the URL is wrong or
   * the station blocks cross-origin playback.
   */
  const testStream = (stream) => {
    setTesting({ id: stream.id, status: 'testing' });
    const probe = new Audio();
    probe.crossOrigin = 'anonymous';

    const done = (status) => {
      probe.pause();
      probe.removeAttribute('src');
      setTesting({ id: stream.id, status });
      setTimeout(() => setTesting(null), 4000);
    };

    const timer = setTimeout(() => done('timeout'), 8000);
    probe.addEventListener('canplay', () => {
      clearTimeout(timer);
      done('ok');
    });
    probe.addEventListener('error', () => {
      clearTimeout(timer);
      done('failed');
    });

    probe.src = stream.stream_url;
    probe.load();
  };

  const onSave = async () => {
    setError(null);
    if (!form.name.trim()) {
      setError('Give the station a name.');
      return;
    }
    if (!/^https?:\/\//i.test(form.streamUrl.trim())) {
      setError('The stream URL must start with http:// or https://');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        streamUrl: form.streamUrl.trim(),
        genre: form.genre.trim() || undefined,
        description: form.description.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
        metadataUrl: form.metadataUrl.trim() || undefined,
        isLive: form.isLive,
        displayOrder: Number(form.displayOrder) || 0,
      };
      if (editing) await radioApi.update(editing.id, payload);
      else await radioApi.create(payload);

      toast.success(editing ? 'Stream updated' : 'Stream added');
      setOpen(false);
      streams.refetch();
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
      await radioApi.remove(pendingDelete.id);
      toast.success('Stream removed');
      setPendingDelete(null);
      streams.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const items = streams.data?.items || [];

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-headline-md font-bold">Radio streams</h2>
        <button type="button" onClick={openCreate} className="btn-primary ml-auto">
          <Icon name="add" size={18} />
          Add stream
        </button>
      </header>

      <p className="text-sm text-on-surface-variant">
        Point these at your Icecast or SHOUTcast endpoints. The browser plays them through the
        HTML5 Audio API, so the station must serve the stream over the same protocol as the site
        (HTTPS in production) and permit cross-origin playback.
      </p>

      {streams.loading ? (
        <div className="card p-5"><ListSkeleton rows={3} /></div>
      ) : streams.error ? (
        <ErrorState message={streams.error} onRetry={streams.refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="radio" title="No streams configured" description="Add the first station to start broadcasting." />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((stream) => (
              <li key={stream.id} className="flex flex-wrap items-center gap-3 p-3 md:p-4">
                <span
                  className={classNames(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                    stream.is_live ? 'bg-live/15 text-live' : 'bg-surface-container-highest text-on-surface-variant'
                  )}
                >
                  <Icon name="radio" size={22} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-on-surface">
                    {stream.name}
                    {stream.is_live && (
                      <span className="badge-live shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
                        Live
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-on-surface-variant">{stream.stream_url}</p>
                </div>

                {testing?.id === stream.id && (
                  <span
                    className={classNames(
                      'shrink-0 text-xs',
                      testing.status === 'ok' ? 'text-success' : testing.status === 'testing' ? 'text-on-surface-variant' : 'text-error'
                    )}
                  >
                    {testing.status === 'testing' && 'Testing…'}
                    {testing.status === 'ok' && 'Stream reachable'}
                    {testing.status === 'failed' && 'Could not connect'}
                    {testing.status === 'timeout' && 'Timed out'}
                  </span>
                )}

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button" onClick={() => testStream(stream)} className="btn-icon"
                    title="Test this stream" aria-label="Test this stream"
                  >
                    <Icon name="network_check" size={18} />
                  </button>
                  <button type="button" onClick={() => openEdit(stream)} className="btn-icon" aria-label="Edit">
                    <Icon name="edit" size={18} />
                  </button>
                  <button
                    type="button" onClick={() => setPendingDelete(stream)}
                    className="btn-icon hover:text-error" aria-label="Delete"
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
        title={editing ? 'Edit stream' : 'Add a stream'}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</button>
            <button type="button" className="btn-primary" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="stream-name">Station name</label>
            <input
              id="stream-name" className="input" value={form.name}
              onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
            />
          </div>

          <div>
            <label className="label" htmlFor="stream-url">Stream URL</label>
            <input
              id="stream-url" className="input" value={form.streamUrl} placeholder="https://ice.example.com/live"
              onChange={(event) => setForm((f) => ({ ...f, streamUrl: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="stream-genre">Genre</label>
              <input
                id="stream-genre" className="input" value={form.genre}
                onChange={(event) => setForm((f) => ({ ...f, genre: event.target.value }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="stream-order">Display order</label>
              <input
                id="stream-order" type="number" min="0" className="input" value={form.displayOrder}
                onChange={(event) => setForm((f) => ({ ...f, displayOrder: event.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="stream-description">Description</label>
            <textarea
              id="stream-description" rows={2} className="input resize-y" value={form.description}
              onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
            />
          </div>

          <div>
            <label className="label" htmlFor="stream-logo">Logo URL</label>
            <input
              id="stream-logo" className="input" value={form.logoUrl} placeholder="/uploads/images/logo.png"
              onChange={(event) => setForm((f) => ({ ...f, logoUrl: event.target.value }))}
            />
          </div>

          <div>
            <label className="label" htmlFor="stream-metadata">
              Metadata URL <span className="normal-case tracking-normal opacity-60">(optional — Icecast status-json.xsl)</span>
            </label>
            <input
              id="stream-metadata" className="input" value={form.metadataUrl}
              placeholder="https://ice.example.com/status-json.xsl"
              onChange={(event) => setForm((f) => ({ ...f, metadataUrl: event.target.value }))}
            />
            <p className="mt-1.5 text-xs text-on-surface-variant">
              Supplying this enables the &ldquo;Now Playing&rdquo; readout. The server fetches it, so
              the station does not need to allow browser cross-origin requests.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox" checked={form.isLive}
              onChange={(event) => setForm((f) => ({ ...f, isLive: event.target.checked }))}
              className="h-4 w-4 rounded accent-primary-container"
            />
            Live — show this station to listeners
          </label>

          <InlineError message={error} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={onDelete}
        busy={deleting}
        title="Remove this stream?"
        message={`“${pendingDelete?.name}” will no longer be listed for listeners.`}
      />
    </section>
  );
}

import { useCallback, useState } from 'react';
import Icon from '../common/Icon';
import Modal, { ConfirmDialog } from '../common/Modal';
import { ListSkeleton, Spinner } from '../common/Loader';
import { EmptyState, ErrorState, InlineError } from '../common/States';
import { useToast } from '../common/Toast';
import { useFetch } from '../../hooks/useFetch';
import { mediaApi, uploadsApi } from '../../utils/api';
import { mediaUrl } from '../../utils/constants';

/**
 * The gallery, from the dashboard.
 *
 * One dialog covers both kinds: upload a photo, or paste a YouTube link. The
 * server decides which it is from what came in, so there is no "photo or
 * video?" question to answer before you start.
 */

const EMPTY = { title: '', caption: '', imageUrl: '', video: '', takenAt: '' };

export default function GalleryManager() {
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetcher = useCallback(() => mediaApi.list(), []);
  const gallery = useFetch(fetcher);
  const items = gallery.data?.items || [];

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title,
      caption: item.caption || '',
      imageUrl: item.image_url || '',
      video: item.youtube_id || '',
      takenAt: item.taken_at ? item.taken_at.slice(0, 10) : '',
    });
    setError(null);
    setOpen(true);
  };

  const onFile = async (file) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const { url } = await uploadsApi.image(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    setError(null);
    if (!form.title.trim()) {
      setError('Give it a title.');
      return;
    }
    if (!form.imageUrl && !form.video.trim()) {
      setError('Upload a photo, or paste a YouTube link.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        caption: form.caption.trim() || undefined,
        imageUrl: form.imageUrl || undefined,
        video: form.video.trim() || undefined,
        takenAt: form.takenAt || undefined,
      };
      if (editing) await mediaApi.update(editing.id, payload);
      else await mediaApi.create(payload);

      toast.success(editing ? 'Saved' : 'Added to the gallery');
      setOpen(false);
      gallery.refetch();
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
      await mediaApi.remove(pendingDelete.id);
      toast.success('Removed');
      setPendingDelete(null);
      gallery.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const move = async (index, delta) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await mediaApi.reorder(next.map((item) => item.id));
      gallery.refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-headline-md font-bold">Media gallery</h2>
        <button type="button" onClick={openCreate} className="btn-primary ml-auto">
          <Icon name="add_photo_alternate" size={18} />
          Add
        </button>
      </header>

      <p className="text-sm text-fg-muted">
        Photos are uploaded; video is a YouTube link rather than a file, so a long recording costs
        nothing to keep here.
      </p>

      {gallery.loading ? (
        <div className="card p-5"><ListSkeleton rows={5} /></div>
      ) : gallery.error ? (
        <ErrorState message={gallery.error} onRetry={gallery.refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="image"
          title="The gallery is empty"
          description="Add a photo from an event, or a link to a video."
          action={
            <button type="button" onClick={openCreate} className="btn-primary mt-2">
              Add the first
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((item, index) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 p-3 md:p-4">
                <span className="h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {item.poster_url && (
                    <img src={mediaUrl(item.poster_url)} alt="" className="h-full w-full object-cover" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-fg">
                    {item.title}
                    <span className="badge bg-surface-3 text-fg-muted capitalize">{item.kind}</span>
                    {!item.is_active && <span className="badge bg-surface-3 text-fg-muted">Hidden</span>}
                  </p>
                  {item.caption && <p className="truncate text-xs text-fg-muted">{item.caption}</p>}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button" onClick={() => move(index, -1)} disabled={index === 0}
                    className="btn-icon disabled:opacity-30" aria-label="Move up"
                  >
                    <Icon name="arrow_upward" size={17} />
                  </button>
                  <button
                    type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1}
                    className="btn-icon disabled:opacity-30" aria-label="Move down"
                  >
                    <Icon name="arrow_downward" size={17} />
                  </button>
                  <button type="button" onClick={() => openEdit(item)} className="btn-icon" aria-label="Edit">
                    <Icon name="edit" size={18} />
                  </button>
                  <button
                    type="button" onClick={() => setPendingDelete(item)}
                    className="btn-icon hover:text-danger" aria-label="Remove"
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
        title={editing ? 'Edit' : 'Add to the gallery'}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={onSave} disabled={saving || uploading}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="media-title">Title</label>
            <input
              id="media-title" className="input" value={form.title}
              onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
              placeholder="Greek Festival, Lonsdale Street"
            />
          </div>

          <div>
            <span className="label">Photo</span>
            <div className="flex items-center gap-3">
              <span className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface-2">
                {form.imageUrl ? (
                  <img src={mediaUrl(form.imageUrl)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Icon name="image" size={20} className="text-fg-subtle" />
                )}
              </span>
              <label className="btn-secondary cursor-pointer">
                {uploading ? <Spinner size={16} /> : <Icon name="upload" size={17} />}
                {uploading ? 'Uploading…' : form.imageUrl ? 'Replace' : 'Choose a file'}
                <input
                  type="file" accept="image/jpeg,image/png" className="hidden"
                  onChange={(event) => onFile(event.target.files?.[0])}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="media-video">
              …or a YouTube link{' '}
              <span className="normal-case tracking-normal opacity-60">
                (this becomes a video, and the photo above becomes its cover)
              </span>
            </label>
            <input
              id="media-video" className="input" value={form.video}
              onChange={(event) => setForm((f) => ({ ...f, video: event.target.value }))}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="media-date">Date taken</label>
              <input
                id="media-date" type="date" className="input" value={form.takenAt}
                onChange={(event) => setForm((f) => ({ ...f, takenAt: event.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="media-caption">Caption</label>
            <textarea
              id="media-caption" rows={2} className="input resize-y" value={form.caption}
              onChange={(event) => setForm((f) => ({ ...f, caption: event.target.value }))}
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
        title="Remove this?"
        message={`“${pendingDelete?.title}” will be taken out of the gallery.`}
        confirmLabel="Remove"
      />
    </section>
  );
}

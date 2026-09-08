import { useCallback, useState } from 'react';
import Icon from '../common/Icon';
import Modal, { ConfirmDialog } from '../common/Modal';
import { ListSkeleton } from '../common/Loader';
import { EmptyState, ErrorState, InlineError } from '../common/States';
import { useToast } from '../common/Toast';
import { useFetch } from '../../hooks/useFetch';
import { categoriesApi } from '../../utils/api';

const EMPTY = { name: '', description: '', displayOrder: 0 };

export default function CategoriesManager() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetcher = useCallback(() => categoriesApi.list(), []);
  const categories = useFetch(fetcher);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  };

  const openEdit = (category) => {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description || '',
      displayOrder: category.display_order,
    });
    setError(null);
    setOpen(true);
  };

  const onSave = async () => {
    setError(null);
    if (form.name.trim().length < 2) {
      setError('Category names need at least two characters.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        displayOrder: Number(form.displayOrder) || 0,
      };
      if (editing) await categoriesApi.update(editing.id, payload);
      else await categoriesApi.create(payload);

      toast.success(editing ? 'Category updated' : 'Category created');
      setOpen(false);
      categories.refetch();
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
      await categoriesApi.remove(pendingDelete.id);
      toast.success('Category deleted');
      setPendingDelete(null);
      categories.refetch();
    } catch (err) {
      toast.error(err.message);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const items = categories.data?.items || [];

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-headline-md font-bold">Categories</h2>
        <button type="button" onClick={openCreate} className="btn-primary ml-auto">
          <Icon name="add" size={18} />
          New category
        </button>
      </header>

      {categories.loading ? (
        <div className="card p-5"><ListSkeleton rows={4} /></div>
      ) : categories.error ? (
        <ErrorState message={categories.error} onRetry={categories.refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="label" title="No categories" description="Articles need at least one category." />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((category) => (
              <li key={category.id} className="flex items-center gap-3 p-3 md:p-4">
                <span className="badge-category shrink-0">{category.slug}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-on-surface">{category.name}</p>
                  {category.description && (
                    <p className="truncate text-xs text-on-surface-variant">{category.description}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-on-surface-variant">
                  {category.articleCount} article{category.articleCount === 1 ? '' : 's'}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => openEdit(category)} className="btn-icon" aria-label="Edit">
                    <Icon name="edit" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(category)}
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
        title={editing ? 'Edit category' : 'New category'}
        size="sm"
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
            <label className="label" htmlFor="category-name">Name</label>
            <input
              id="category-name"
              className="input"
              value={form.name}
              onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="category-description">Description</label>
            <textarea
              id="category-description"
              rows={2}
              className="input resize-y"
              value={form.description}
              onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="category-order">Display order</label>
            <input
              id="category-order"
              type="number"
              min="0"
              className="input"
              value={form.displayOrder}
              onChange={(event) => setForm((f) => ({ ...f, displayOrder: event.target.value }))}
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
        title="Delete this category?"
        message={`“${pendingDelete?.name}” will be removed. Categories that still have articles cannot be deleted.`}
      />
    </section>
  );
}

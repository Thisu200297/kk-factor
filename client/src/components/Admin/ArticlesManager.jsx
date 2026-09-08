import { useCallback, useMemo, useState } from 'react';
import Icon from '../common/Icon';
import Modal, { ConfirmDialog } from '../common/Modal';
import { ListSkeleton } from '../common/Loader';
import { EmptyState, ErrorState, InlineError } from '../common/States';
import { useToast } from '../common/Toast';
import RichTextEditor from './RichTextEditor';
import ImageUploader from './ImageUploader';
import { useFetch } from '../../hooks/useFetch';
import { articlesApi, categoriesApi } from '../../utils/api';
import { formatRelative, classNames, stripHtml } from '../../utils/format';

const EMPTY_FORM = {
  title: '',
  excerpt: '',
  content: '',
  categoryId: '',
  imageUrl: null,
  status: 'draft',
  isBreaking: false,
  isFeatured: false,
};

export default function ArticlesManager() {
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchArticles = useCallback(
    () => articlesApi.list({ includeDrafts: 'true', limit: 50, ...(statusFilter !== 'all' && { status: statusFilter }) }),
    [statusFilter]
  );
  const articles = useFetch(fetchArticles);

  const fetchCategories = useCallback(() => categoriesApi.list(), []);
  const categories = useFetch(fetchCategories);
  const categoryOptions = useMemo(() => categories.data?.items || [], [categories.data]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, categoryId: categoryOptions[0]?.id || '' });
    setFormError(null);
    setEditorOpen(true);
  };

  const openEdit = (article) => {
    setEditing(article);
    setForm({
      title: article.title,
      excerpt: article.excerpt || '',
      content: article.content || '',
      categoryId: article.category_id,
      imageUrl: article.image_url,
      status: article.status,
      isBreaking: Boolean(article.is_breaking),
      isFeatured: Boolean(article.is_featured),
    });
    setFormError(null);
    setEditorOpen(true);
  };

  const onSave = async () => {
    setFormError(null);

    if (form.title.trim().length < 3) {
      setFormError('The headline needs at least three characters.');
      return;
    }
    if (stripHtml(form.content).length < 10) {
      setFormError('The article body is too short.');
      return;
    }
    if (!form.categoryId) {
      setFormError('Choose a category.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        excerpt: form.excerpt.trim() || undefined,
        content: form.content,
        categoryId: form.categoryId,
        imageUrl: form.imageUrl || undefined,
        status: form.status,
        isBreaking: form.isBreaking,
        isFeatured: form.isFeatured,
      };

      if (editing) {
        await articlesApi.update(editing.id, payload);
        toast.success('Article updated');
      } else {
        await articlesApi.create(payload);
        toast.success('Article created');
      }

      setEditorOpen(false);
      articles.refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /** Publish/unpublish without opening the full editor. */
  const toggleStatus = async (article) => {
    const nextStatus = article.status === 'published' ? 'draft' : 'published';
    try {
      await articlesApi.update(article.id, { status: nextStatus });
      toast.success(nextStatus === 'published' ? 'Article published' : 'Article unpublished');
      articles.refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const onDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await articlesApi.remove(pendingDelete.id);
      toast.success('Article deleted');
      setPendingDelete(null);
      articles.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const items = articles.data?.items || [];

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-headline-md font-bold">Articles</h2>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-surface-container-high p-1">
            {['all', 'published', 'draft'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={classNames(
                  'rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  statusFilter === value ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
                )}
              >
                {value}
              </button>
            ))}
          </div>

          <button type="button" onClick={openCreate} className="btn-primary">
            <Icon name="add" size={18} />
            New article
          </button>
        </div>
      </header>

      {articles.loading ? (
        <div className="card p-5"><ListSkeleton rows={6} /></div>
      ) : articles.error ? (
        <ErrorState message={articles.error} onRetry={articles.refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="article"
          title="No articles yet"
          description="Create the first story to populate the homepage."
          action={<button type="button" onClick={openCreate} className="btn-primary mt-2">Create an article</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((article) => (
              <li key={article.id} className="flex flex-wrap items-center gap-3 p-3 md:p-4">
                <span
                  className={classNames(
                    'badge shrink-0',
                    article.status === 'published'
                      ? 'bg-success/15 text-success'
                      : article.status === 'draft'
                        ? 'bg-surface-container-highest text-on-surface-variant'
                        : 'bg-error-container/20 text-error'
                  )}
                >
                  {article.status}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-on-surface">{article.title}</p>
                  <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                    {article.category?.name} · {article.author?.name} · {formatRelative(article.created_at)}
                    {article.is_breaking && ' · breaking'}
                    {article.is_featured && ' · featured'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleStatus(article)}
                    className="btn-icon"
                    title={article.status === 'published' ? 'Unpublish' : 'Publish'}
                    aria-label={article.status === 'published' ? 'Unpublish' : 'Publish'}
                  >
                    <Icon name={article.status === 'published' ? 'visibility_off' : 'publish'} size={18} />
                  </button>
                  <button type="button" onClick={() => openEdit(article)} className="btn-icon" aria-label="Edit">
                    <Icon name="edit" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(article)}
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
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? 'Edit article' : 'New article'}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create article'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="article-title">Headline</label>
            <input
              id="article-title"
              className="input"
              value={form.title}
              onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
              placeholder="Write the headline"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="article-category">Category</label>
              <select
                id="article-category"
                className="input"
                value={form.categoryId}
                onChange={(event) => setForm((f) => ({ ...f, categoryId: event.target.value }))}
              >
                <option value="">Choose a category…</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="article-status">Status</label>
              <select
                id="article-status"
                className="input"
                value={form.status}
                onChange={(event) => setForm((f) => ({ ...f, status: event.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="article-excerpt">
              Summary <span className="normal-case tracking-normal opacity-60">(optional — generated from the body if left blank)</span>
            </label>
            <textarea
              id="article-excerpt"
              rows={2}
              className="input resize-y"
              value={form.excerpt}
              onChange={(event) => setForm((f) => ({ ...f, excerpt: event.target.value }))}
              placeholder="One or two sentences for the article card"
            />
          </div>

          <ImageUploader
            value={form.imageUrl}
            onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
          />

          <div>
            <span className="label">Body</span>
            <RichTextEditor
              resetKey={editing ? `article-${editing.id}` : 'new'}
              value={form.content}
              onChange={(html) => setForm((f) => ({ ...f, content: html }))}
            />
          </div>

          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={form.isBreaking}
                onChange={(event) => setForm((f) => ({ ...f, isBreaking: event.target.checked }))}
                className="h-4 w-4 rounded accent-primary-container"
              />
              Show in the breaking-news ticker
            </label>

            <label className="flex items-center gap-2 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) => setForm((f) => ({ ...f, isFeatured: event.target.checked }))}
                className="h-4 w-4 rounded accent-primary-container"
              />
              Feature on the homepage hero
            </label>
          </div>

          <InlineError message={formError} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={onDelete}
        busy={deleting}
        title="Delete this article?"
        message={`“${pendingDelete?.title}” will be permanently removed. This cannot be undone.`}
      />
    </section>
  );
}

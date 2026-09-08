import { useCallback, useState } from 'react';
import Icon from '../common/Icon';
import Modal, { ConfirmDialog } from '../common/Modal';
import { ListSkeleton, Spinner } from '../common/Loader';
import { EmptyState, ErrorState, InlineError } from '../common/States';
import { useToast } from '../common/Toast';
import { useFetch } from '../../hooks/useFetch';
import { partnersApi, uploadsApi } from '../../utils/api';
import { classNames } from '../../utils/format';
import { mediaUrl } from '../../utils/constants';

/**
 * One screen for both sponsors and the organisations panel — they are the same
 * record with a different `kind`, so a tab switches which list you are editing
 * rather than duplicating the whole screen.
 *
 * Order is what the client cares about most (sponsors pay for position), so
 * reordering is two arrow buttons per row rather than drag-and-drop: it works
 * on a phone, it works with a keyboard, and there is nothing to learn.
 */

const EMPTY = {
  name: '',
  websiteUrl: '',
  phone: '',
  email: '',
  description: '',
  logoUrl: '',
  isActive: true,
};

export default function PartnersManager({ kind = 'sponsor' }) {
  const toast = useToast();
  const [tab, setTab] = useState(kind);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetcher = useCallback(() => partnersApi.list(tab), [tab]);
  const partners = useFetch(fetcher);
  const items = partners.data?.items || [];

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  };

  const openEdit = (partner) => {
    setEditing(partner);
    setForm({
      name: partner.name,
      websiteUrl: partner.website_url || '',
      phone: partner.phone || '',
      email: partner.email || '',
      description: partner.description || '',
      logoUrl: partner.logo_url || '',
      isActive: partner.is_active,
    });
    setError(null);
    setOpen(true);
  };

  const onLogo = async (file) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const { url } = await uploadsApi.image(file);
      setForm((f) => ({ ...f, logoUrl: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    setError(null);

    if (!form.name.trim()) {
      setError('Give them a name.');
      return;
    }
    if (!form.websiteUrl.trim() && !form.phone.trim() && !form.email.trim()) {
      setError('Add a website, or a phone number or email to show instead.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        kind: tab,
        name: form.name.trim(),
        websiteUrl: form.websiteUrl.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        description: form.description.trim() || undefined,
        logoUrl: form.logoUrl || undefined,
        isActive: form.isActive,
      };

      if (editing) await partnersApi.update(editing.id, payload);
      else await partnersApi.create({ ...payload, displayOrder: items.length });

      toast.success(editing ? 'Saved' : `Added to ${tab === 'sponsor' ? 'sponsors' : 'organisations'}`);
      setOpen(false);
      partners.refetch();
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
      await partnersApi.remove(pendingDelete.id);
      toast.success('Removed');
      setPendingDelete(null);
      partners.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  /** Swaps a row with its neighbour and saves the whole order in one call. */
  const move = async (index, delta) => {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    try {
      await partnersApi.reorder(next.map((item) => item.id));
      partners.refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleActive = async (partner) => {
    try {
      await partnersApi.update(partner.id, { isActive: !partner.is_active });
      partners.refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-headline-md font-bold">Sponsors &amp; partners</h2>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-surface-3 p-1">
            {[
              { id: 'sponsor', label: 'Sponsors' },
              { id: 'organisation', label: 'Organisations' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={classNames(
                  'rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
                  tab === item.id ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:text-fg'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button type="button" onClick={openCreate} className="btn-primary">
            <Icon name="add" size={18} />
            Add
          </button>
        </div>
      </header>

      <p className="text-sm text-fg-muted">
        {tab === 'sponsor'
          ? 'These run across the top of every page, in this order. A sponsor with no website shows its phone number and email when someone clicks the logo.'
          : 'These appear in the sidebar on the home page. Make sure you have permission to use each logo.'}
      </p>

      {partners.loading ? (
        <div className="card p-5">
          <ListSkeleton rows={5} />
        </div>
      ) : partners.error ? (
        <ErrorState message={partners.error} onRetry={partners.refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="label"
          title={tab === 'sponsor' ? 'No sponsors yet' : 'No organisations yet'}
          description="Add the first one and it appears on the site straight away."
          action={
            <button type="button" onClick={openCreate} className="btn-primary mt-2">
              Add the first
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((partner, index) => (
              <li key={partner.id} className="flex flex-wrap items-center gap-3 p-3 md:p-4">
                <span className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg border border-line bg-white p-1.5">
                  {partner.logo_url ? (
                    <img
                      src={mediaUrl(partner.logo_url)}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Icon name="image" size={18} className="text-fg-subtle" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-fg">
                    {partner.name}
                    {!partner.is_active && (
                      <span className="badge bg-surface-3 text-fg-muted">Hidden</span>
                    )}
                    {!partner.logo_url && (
                      <span className="badge bg-primary-soft text-primary">Needs a logo</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-fg-muted">
                    {partner.website_url || [partner.phone, partner.email].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>

                <span className="shrink-0 text-xs tabular-nums text-fg-subtle" title="Logo clicks">
                  {partner.clicks} clicks
                </span>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="btn-icon disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <Icon name="arrow_upward" size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    className="btn-icon disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <Icon name="arrow_downward" size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(partner)}
                    className="btn-icon"
                    aria-label={partner.is_active ? 'Hide from the site' : 'Show on the site'}
                    title={partner.is_active ? 'Hide from the site' : 'Show on the site'}
                  >
                    <Icon name={partner.is_active ? 'visibility' : 'visibility_off'} size={18} />
                  </button>
                  <button type="button" onClick={() => openEdit(partner)} className="btn-icon" aria-label="Edit">
                    <Icon name="edit" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(partner)}
                    className="btn-icon hover:text-danger"
                    aria-label="Remove"
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
        title={editing ? `Edit ${editing.name}` : tab === 'sponsor' ? 'Add a sponsor' : 'Add an organisation'}
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
            <label className="label" htmlFor="partner-name">Name</label>
            <input
              id="partner-name"
              className="input"
              value={form.name}
              onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
              placeholder="Gavos Freight Solutions"
            />
          </div>

          <div>
            <span className="label">Logo</span>
            <div className="flex items-center gap-3">
              <span className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg border border-line bg-white p-2">
                {form.logoUrl ? (
                  <img src={mediaUrl(form.logoUrl)} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <Icon name="image" size={20} className="text-fg-subtle" />
                )}
              </span>
              <label className="btn-secondary cursor-pointer">
                {uploading ? <Spinner size={16} /> : <Icon name="upload" size={17} />}
                {uploading ? 'Uploading…' : form.logoUrl ? 'Replace' : 'Choose a file'}
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(event) => onLogo(event.target.files?.[0])}
                />
              </label>
              {form.logoUrl && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setForm((f) => ({ ...f, logoUrl: '' }))}
                >
                  Remove
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-fg-muted">JPG or PNG, up to 5 MB. Wider than it is tall works best.</p>
          </div>

          <div>
            <label className="label" htmlFor="partner-site">Website</label>
            <input
              id="partner-site"
              className="input"
              value={form.websiteUrl}
              onChange={(event) => setForm((f) => ({ ...f, websiteUrl: event.target.value }))}
              placeholder="https://gfs.net.au/"
            />
          </div>

          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="text-sm font-medium text-fg">No website?</p>
            <p className="mt-1 text-xs text-fg-muted">
              Leave the website blank and fill these in instead. Clicking the logo will show them.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="partner-phone">Phone</label>
                <input
                  id="partner-phone"
                  className="input"
                  value={form.phone}
                  onChange={(event) => setForm((f) => ({ ...f, phone: event.target.value }))}
                  placeholder="0400 000 000"
                />
              </div>
              <div>
                <label className="label" htmlFor="partner-email">Email</label>
                <input
                  id="partner-email"
                  className="input"
                  value={form.email}
                  onChange={(event) => setForm((f) => ({ ...f, email: event.target.value }))}
                  placeholder="hello@example.com.au"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="partner-desc">Short description (optional)</label>
            <textarea
              id="partner-desc"
              rows={2}
              className="input resize-y"
              value={form.description}
              onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-fg">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((f) => ({ ...f, isActive: event.target.checked }))}
              className="h-4 w-4 rounded accent-primary"
            />
            Show on the site
          </label>

          <InlineError message={error} />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={onDelete}
        busy={deleting}
        title="Remove this one?"
        message={`“${pendingDelete?.name}” will no longer appear on the site.`}
        confirmLabel="Remove"
      />
    </section>
  );
}

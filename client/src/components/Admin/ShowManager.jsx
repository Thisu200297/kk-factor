import { useCallback, useEffect, useState } from 'react';
import Icon from '../common/Icon';
import Modal, { ConfirmDialog } from '../common/Modal';
import { ListSkeleton, Spinner } from '../common/Loader';
import { EmptyState, ErrorState, InlineError } from '../common/States';
import { useToast } from '../common/Toast';
import { useFetch } from '../../hooks/useFetch';
import { episodesApi, showApi, importApi } from '../../utils/api';
import { formatRelative, formatDuration, classNames } from '../../utils/format';

/**
 * The Show — going live, and the episode archive.
 *
 * GOING LIVE is a switch rather than something the site detects. Asking
 * YouTube whether a channel is on air needs an API key and burns its daily
 * quota polling for an answer the presenter already has; she is pressing "go
 * live" on YouTube at that moment anyway.
 *
 * The same press writes the social post for her. Posting on her behalf is not
 * possible: TikTok keeps anything an unaudited app publishes private,
 * Instagram wants a business account and Meta's app review, and LinkedIn does
 * not open personal-profile posting to ordinary developers. A composed post
 * and a copy button is the honest version.
 *
 * THE ARCHIVE fills itself from the YouTube channel feed, so this list is
 * mostly for hiding an episode, marking one for members, or typing in a
 * duration — the one thing the feed does not carry.
 */
export default function ShowManager() {
  const toast = useToast();

  const fetchLive = useCallback(() => showApi.getLive(), []);
  const fetchEpisodes = useCallback(() => episodesApi.list({ limit: 50 }), []);

  const live = useFetch(fetchLive);
  const episodes = useFetch(fetchEpisodes);

  return (
    <section className="space-y-6">
      <h2 className="text-headline-md font-bold">The show</h2>
      <GoLive state={live.data?.live} loading={live.loading} onChanged={live.refetch} toast={toast} />
      <Schedule state={live.data?.schedule} onChanged={live.refetch} toast={toast} />
      <Archive query={episodes} toast={toast} />
    </section>
  );
}

/* --------------------------------------------------------------- schedule -- */

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

/**
 * The weekly slot, which is what the countdown on the site counts down to.
 *
 * Stored as a weekday and a wall-clock time in a named zone rather than as a
 * moment. That is what keeps the show at 7.30pm on both sides of the
 * daylight-saving change, instead of quietly becoming 8.30 for half the year.
 */
function Schedule({ state, onChanged, toast }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!state) return;
    setForm({
      enabled: state.enabled !== false,
      weekday: Number(state.weekday ?? 2),
      startTime: state.startTime || '19:30',
      endTime: state.endTime || '21:30',
      timezone: state.timezone || 'Australia/Melbourne',
      title: state.title || '',
      note: state.note || '',
    });
  }, [state]);

  if (!form) return <div className="card p-5"><ListSkeleton rows={3} /></div>;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const onSave = async () => {
    setError(null);
    setBusy(true);
    try {
      await showApi.setSchedule(form);
      toast.success('Schedule saved');
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const next = state?.next;

  return (
    <div className="card p-5 md:p-6">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="text-headline-sm">When the show is on</h3>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => set({ enabled: event.target.checked })}
          />
          Show this on the site
        </label>
      </header>

      <p className="mb-5 text-sm text-fg-muted">
        The site counts down to this and offers listeners a calendar entry. Times are in the zone
        below, so the show stays at the same hour when the clocks change.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="sched-day">Day</label>
          <select
            id="sched-day" className="input" value={form.weekday}
            onChange={(event) => set({ weekday: Number(event.target.value) })}
          >
            {WEEKDAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="sched-start">Starts</label>
          <input
            id="sched-start" type="time" className="input" value={form.startTime}
            onChange={(event) => set({ startTime: event.target.value })}
          />
        </div>

        <div>
          <label className="label" htmlFor="sched-end">Ends</label>
          <input
            id="sched-end" type="time" className="input" value={form.endTime}
            onChange={(event) => set({ endTime: event.target.value })}
          />
        </div>

        <div>
          <label className="label" htmlFor="sched-tz">Time zone</label>
          <input
            id="sched-tz" className="input" value={form.timezone}
            onChange={(event) => set({ timezone: event.target.value })}
            placeholder="Australia/Melbourne"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="sched-title">Name of the show</label>
          <input
            id="sched-title" className="input" value={form.title}
            onChange={(event) => set({ title: event.target.value })}
            placeholder="The Greek Eurobeat Show"
          />
        </div>
        <div>
          <label className="label" htmlFor="sched-note">One line underneath</label>
          <input
            id="sched-note" className="input" value={form.note}
            onChange={(event) => set({ note: event.target.value })}
            placeholder="Live on RPP FM 98.7 / 98.3 and on YouTube"
          />
        </div>
      </div>

      <InlineError message={error} />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={onSave} disabled={busy}>
          {busy ? <Spinner size={16} /> : <Icon name="save" size={17} />}
          {busy ? 'Saving…' : 'Save'}
        </button>

        {next && (
          <p className="text-sm text-fg-muted">
            Next:{' '}
            <strong className="text-fg">
              {new Intl.DateTimeFormat('en-AU', {
                timeZone: form.timezone,
                weekday: 'long', day: 'numeric', month: 'short',
                hour: 'numeric', minute: '2-digit',
              }).format(new Date(next.startsAt))}
            </strong>
            {state?.abbreviation && <> {state.abbreviation}</>}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- go live -- */

function GoLive({ state, loading, onChanged, toast }) {
  const [title, setTitle] = useState('');
  const [video, setVideo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [post, setPost] = useState(null);
  const [copied, setCopied] = useState(false);

  const isLive = Boolean(state?.isLive);

  useEffect(() => {
    if (state?.isLive) {
      setTitle(state.title || '');
      setVideo(state.videoUrl || '');
    }
  }, [state]);

  const start = async () => {
    setError(null);
    if (!video.trim()) {
      setError('Paste the link to tonight’s YouTube stream.');
      return;
    }
    setBusy(true);
    try {
      const result = await showApi.setLive({
        isLive: true,
        title: title.trim() || undefined,
        video: video.trim(),
        siteUrl: window.location.origin,
      });
      if (!result.live.videoId) {
        setError('That does not look like a YouTube link. Check it and try again.');
        return;
      }
      setPost(result.post);
      setCopied(false);
      onChanged();
      toast.success('You are live on the site');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await showApi.setLive({ isLive: false });
      setPost(null);
      onChanged();
      toast.success('Live banner switched off');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(post);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Your browser would not let us copy. Select the text and copy it by hand.');
    }
  };

  return (
    <div
      className={classNames(
        'card overflow-hidden',
        isLive && 'ring-2 ring-live'
      )}
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <span
          className={classNames(
            'flex h-10 w-10 items-center justify-center rounded-xl',
            isLive ? 'bg-live text-white' : 'bg-surface-3 text-fg-muted'
          )}
        >
          <Icon name="radio" size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-fg">
            {loading ? 'Checking…' : isLive ? 'You are on air' : 'Off air'}
            {isLive && <span className="h-2 w-2 animate-pulse-live rounded-full bg-live" />}
          </p>
          <p className="text-xs text-fg-muted">
            {isLive
              ? 'The red banner is showing on every page.'
              : 'Turn this on when you start streaming on YouTube.'}
          </p>
        </div>

        {isLive && (
          <button type="button" onClick={stop} className="btn-secondary" disabled={busy}>
            {busy ? <Spinner size={16} /> : <Icon name="block" size={17} />}
            End the broadcast
          </button>
        )}
      </div>

      {!isLive && (
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="live-title">What is on tonight?</label>
              <input
                id="live-title"
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="The Greek Eurobeat Show — with Pantelis Krestas"
              />
            </div>
            <div>
              <label className="label" htmlFor="live-video">YouTube link</label>
              <input
                id="live-video"
                className="input"
                value={video}
                onChange={(event) => setVideo(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
              />
            </div>
          </div>

          <button type="button" onClick={start} className="btn-primary" disabled={busy}>
            {busy ? <Spinner size={16} /> : <Icon name="bolt" size={17} filled />}
            Go live
          </button>

          <InlineError message={error} />
        </div>
      )}

      {post && (
        <div className="border-t border-line bg-surface-2 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Icon name="publish" size={16} className="text-primary" />
            <p className="text-sm font-semibold text-fg">Post this to your socials</p>
          </div>
          <p className="mb-3 text-xs text-fg-muted">
            Copy it and paste it into Facebook, Instagram, TikTok and LinkedIn. Those platforms do
            not let a website post for you.
          </p>
          <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed text-fg">
            {post}
          </pre>
          <button type="button" onClick={copy} className="btn-secondary mt-3">
            <Icon name={copied ? 'check_circle' : 'add'} size={17} />
            {copied ? 'Copied' : 'Copy the post'}
          </button>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- archive -- */

function Archive({ query, toast }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ duration: '', tier: 'normal', status: 'published' });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const items = query.data?.items || [];

  const openEdit = (episode) => {
    setEditing(episode);
    setForm({
      duration: episode.duration ? String(episode.duration) : '',
      tier: episode.tier,
      status: episode.status,
    });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await episodesApi.update(editing.id, {
        duration: Number.parseInt(form.duration, 10) || 0,
        tier: form.tier,
        status: form.status,
      });
      toast.success('Episode updated');
      setEditing(null);
      query.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await episodesApi.remove(pendingDelete.id);
      toast.success('Episode removed');
      setPendingDelete(null);
      query.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const refreshFeeds = async () => {
    setRefreshing(true);
    try {
      const result = await importApi.run();
      const e = result.episodes || {};
      const n = result.news || {};
      toast.success(
        `Episodes: ${e.imported || 0} new. News: ${n.imported || 0} new.`
      );
      query.refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const feature = async (episode) => {
    try {
      await episodesApi.update(episode.id, { isFeatured: !episode.is_featured });
      query.refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h3 className="text-headline-sm">Episodes</h3>
        <button type="button" onClick={refreshFeeds} className="btn-secondary ml-auto" disabled={refreshing}>
          {refreshing ? <Spinner size={16} /> : <Icon name="refresh" size={17} />}
          {refreshing ? 'Checking YouTube…' : 'Refresh from YouTube'}
        </button>
      </header>

      <p className="text-sm text-fg-muted">
        Episodes arrive here on their own after a live stream ends — there is nothing to upload.
        YouTube does not tell us how long each one is, so fill that in if you want it shown.
      </p>

      {query.loading ? (
        <div className="card p-5">
          <ListSkeleton rows={5} />
        </div>
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.refetch} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="radio"
          title="No episodes yet"
          description="Press “Refresh from YouTube” once you have streamed a show."
        />
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {items.map((episode) => (
              <li key={episode.id} className="flex flex-wrap items-center gap-3 p-3 md:p-4">
                <span className="h-11 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {episode.thumbnail_url && (
                    <img src={episode.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                    <span className="truncate">{episode.title}</span>
                    {episode.is_featured && <span className="badge bg-primary-soft text-primary">Featured</span>}
                    {episode.tier === 'premium' && <span className="badge bg-surface-3 text-accent">Members</span>}
                    {episode.status === 'hidden' && <span className="badge bg-surface-3 text-fg-muted">Hidden</span>}
                  </p>
                  <p className="truncate text-xs text-fg-muted">
                    {formatRelative(episode.published_at)}
                    {episode.duration ? ` · ${formatDuration(episode.duration)}` : ' · length not set'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => feature(episode)}
                    className={classNames('btn-icon', episode.is_featured && 'text-primary')}
                    aria-label={episode.is_featured ? 'Unpin from the top' : 'Pin to the top'}
                    title={episode.is_featured ? 'Unpin from the top' : 'Pin to the top'}
                  >
                    <Icon name="trending_up" size={18} />
                  </button>
                  <button type="button" onClick={() => openEdit(episode)} className="btn-icon" aria-label="Edit">
                    <Icon name="edit" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(episode)}
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
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.title || ''}
        size="sm"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="ep-duration">Length in seconds</label>
            <input
              id="ep-duration"
              type="number"
              min="0"
              className="input"
              value={form.duration}
              onChange={(event) => setForm((f) => ({ ...f, duration: event.target.value }))}
              placeholder="7273"
            />
            <p className="mt-1.5 text-xs text-fg-muted">
              A two-hour show is 7200. Leave it blank to show no length at all.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="ep-tier">Who can play it</label>
            <select
              id="ep-tier"
              className="input"
              value={form.tier}
              onChange={(event) => setForm((f) => ({ ...f, tier: event.target.value }))}
            >
              <option value="normal">Everyone</option>
              <option value="premium">Members only</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="ep-status">On the site</label>
            <select
              id="ep-status"
              className="input"
              value={form.status}
              onChange={(event) => setForm((f) => ({ ...f, status: event.target.value }))}
            >
              <option value="published">Showing</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={onDelete}
        busy={deleting}
        title="Remove this episode?"
        message={`“${pendingDelete?.title}” will disappear from the site. The video stays on YouTube, and the next refresh will bring it back — hide it instead if you want it gone for good.`}
        confirmLabel="Remove"
      />
    </div>
  );
}

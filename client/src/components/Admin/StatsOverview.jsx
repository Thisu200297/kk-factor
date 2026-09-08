import { useCallback } from 'react';
import Icon from '../common/Icon';
import { ErrorState } from '../common/States';
import { useFetch } from '../../hooks/useFetch';
import { statsApi } from '../../utils/api';
import { formatRelative, classNames } from '../../utils/format';

function StatTile({ icon, label, value, hint, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary/15 text-primary',
    tertiary: 'bg-tertiary/15 text-tertiary',
    live: 'bg-live/15 text-live',
    success: 'bg-success/15 text-success',
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label-md uppercase text-on-surface-variant">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-on-surface">{value}</p>
          {hint && <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>}
        </div>
        <span className={classNames('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
          <Icon name={icon} size={20} />
        </span>
      </div>
    </div>
  );
}

export default function StatsOverview({ onNavigate }) {
  const fetcher = useCallback(() => statsApi.overview(), []);
  const { data, loading, error, refetch } = useFetch(fetcher);

  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (loading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="card p-5">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton mt-3 h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon="article"
          label="Total articles"
          value={data.articles.total}
          hint={`${data.articles.published} published · ${data.articles.drafts} draft`}
        />
        <StatTile
          icon="music_note"
          label="Tracks"
          value={data.music.tracks}
          hint={`${data.music.playlists} playlist${data.music.playlists === 1 ? '' : 's'}`}
          tone="tertiary"
        />
        <StatTile
          icon="radio"
          label="Active streams"
          value={data.radio.active}
          hint={`${data.radio.total} configured in total`}
          tone="live"
        />
        <StatTile
          icon="group"
          label="Registered users"
          value={data.users.total}
          hint={`${data.users.admins} administrator${data.users.admins === 1 ? '' : 's'}`}
          tone="success"
        />
      </div>

      <section className="card p-5">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
            Recently created
          </h3>
          <button type="button" onClick={() => onNavigate?.('articles')} className="text-xs font-medium text-primary hover:underline">
            Manage articles
          </button>
        </header>

        {data.recentArticles.length === 0 ? (
          <p className="text-sm text-on-surface-variant">No articles yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.recentArticles.map((article) => (
              <li key={article.id} className="flex items-center gap-3 py-3">
                <span
                  className={classNames(
                    'badge shrink-0',
                    article.status === 'published'
                      ? 'bg-success/15 text-success'
                      : 'bg-surface-container-highest text-on-surface-variant'
                  )}
                >
                  {article.status}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-on-surface">{article.title}</span>
                <span className="hidden shrink-0 text-xs text-on-surface-variant sm:block">
                  {formatRelative(article.created_at)}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-on-surface-variant">
                  <Icon name="visibility" size={14} />
                  {article.views}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

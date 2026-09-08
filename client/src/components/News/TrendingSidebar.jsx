import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { articlesApi } from '../../utils/api';
import { formatRelative } from '../../utils/format';

export default function TrendingSidebar() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    articlesApi
      .trending()
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="panel p-4">
      <h2 className="mb-2 flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-fg-muted">
        <Icon name="trending_up" size={14} className="text-primary" />
        Trending
      </h2>

      {loading ? (
        <div className="space-y-3 py-1">
          {[0, 1, 2, 3, 4].map((key) => (
            <div key={key} className="flex items-center gap-3">
              <div className="skeleton h-3 w-5" />
              <div className="skeleton h-3 flex-1" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-2 text-[0.8125rem] text-fg-muted">Nothing trending just yet.</p>
      ) : (
        <ol className="divide-y divide-line">
          {items.slice(0, 5).map((article, index) => (
            <li key={article.id}>
              <Link
                to={`/article/${article.slug}`}
                className="group -mx-1.5 flex items-baseline gap-3 rounded-lg px-1.5 py-2.5 transition-colors hover:bg-fill/[0.04]"
              >
                <span className="w-4 shrink-0 text-[0.8125rem] font-bold tabular-nums text-fg-subtle/70 transition-colors group-hover:text-primary">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-[0.8125rem] font-medium leading-snug text-fg transition-colors group-hover:text-primary">
                    {article.title}
                  </span>
                  <span className="mt-0.5 block text-[0.6875rem] text-fg-subtle">
                    {formatRelative(article.published_at)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

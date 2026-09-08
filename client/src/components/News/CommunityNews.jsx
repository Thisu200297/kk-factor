import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { useFetch } from '../../hooks/useFetch';
import { articlesApi } from '../../utils/api';
import { formatRelative } from '../../utils/format';
import { mediaUrl } from '../../utils/constants';

/**
 * Community news — the three most recent stories from Greek City Times.
 *
 * Three, because that is what the brief asked for, and because a sidebar that
 * scrolls is a sidebar nobody reads.
 *
 * Every headline leaves the site. We store the headline, the photo and a
 * short excerpt and send the reader to the publisher to finish reading —
 * which is what aggregation is allowed to be without a syndication agreement.
 * If Greek City Times ever give one in writing, NEWS_FULL_TEXT on the server
 * turns these into pages here instead, and this component follows suit
 * because it simply respects `is_external`.
 */
export default function CommunityNews({ limit = 3 }) {
  const fetcher = useCallback(() => articlesApi.list({ limit }), [limit]);
  const { data, loading, error } = useFetch(fetcher);

  const items = data?.items || [];
  const sourceName = items[0]?.source_name || 'Greek City Times';

  return (
    <section aria-labelledby="community-news-heading">
      <div className="mb-3 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <h2 id="community-news-heading" className="text-label-md uppercase text-fg-muted">
          Community news
        </h2>
        <span className="h-px flex-1 bg-line" />
      </div>

      <p className="mb-3 text-headline-sm text-fg">{sourceName}</p>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((key) => (
            <div key={key} className="flex gap-3">
              <div className="skeleton h-14 w-16 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="py-2 text-[0.8125rem] text-fg-muted">The news feed is not answering right now.</p>
      ) : items.length === 0 ? (
        <p className="py-2 text-[0.8125rem] text-fg-muted">
          No stories yet. They arrive on their own once the feed refreshes.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((article) => (
            <li key={article.id}>
              <NewsRow article={article} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs">
        <Link to="/news" className="font-medium text-primary hover:underline">
          All community news
        </Link>
      </p>
    </section>
  );
}

function NewsRow({ article }) {
  const image = mediaUrl(article.image_url);

  const body = (
    <>
      {image && (
        <span className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-apple group-hover:scale-[1.05]"
          />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[0.8125rem] font-medium leading-snug text-fg transition-colors group-hover:text-primary">
          {article.title}
        </span>
        <span className="mt-1 flex items-center gap-1 text-[0.6875rem] text-fg-subtle">
          {article.category?.name} · {formatRelative(article.published_at)}
          {article.is_external && <Icon name="open_in_new" size={11} className="opacity-70" />}
        </span>
      </span>
    </>
  );

  const className = 'group -mx-1.5 flex items-start gap-3 rounded-xl p-1.5 transition-colors hover:bg-fill/[0.04]';

  /**
   * An imported story opens at the publisher; anything written here opens here.
   * The rule lives in the data, so nothing has to change when both exist.
   */
  if (article.is_external && article.source_url) {
    return (
      <a href={article.source_url} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
      </a>
    );
  }

  return (
    <Link to={`/article/${article.slug}`} className={className}>
      {body}
    </Link>
  );
}

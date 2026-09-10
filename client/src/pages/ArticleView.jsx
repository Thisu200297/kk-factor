import { useCallback, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import ArticleCard from '../components/News/ArticleCard';
import RadioWidget from '../components/RadioPlayer/RadioWidget';
import Icon from '../components/common/Icon';
import { PageLoader } from '../components/common/Loader';
import { ErrorState } from '../components/common/States';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { articlesApi } from '../utils/api';
import { formatDate, readingTime } from '../utils/format';
import { mediaUrl } from '../utils/constants';

export default function ArticleView() {
  const { slug } = useParams();

  const fetcher = useCallback(() => articlesApi.get(slug), [slug]);
  const { data, loading, error, refetch } = useFetch(fetcher);

  const article = data?.article;
  const related = data?.related || [];

  useDocumentTitle(article?.title);

  /**
   * Republished with permission is still republished: two copies of the same
   * article exist on the web, and without a canonical the search engines have
   * to guess which is the original. Pointing at the publisher is both the
   * honest answer and the one that keeps their ranking intact — it is a large
   * part of what a newsroom is agreeing to when it says yes.
   */
  useEffect(() => {
    const canonical = article?.is_external ? article.source_url : null;
    if (!canonical) return undefined;

    const tag = document.createElement('link');
    tag.rel = 'canonical';
    tag.href = canonical;
    document.head.appendChild(tag);
    return () => tag.remove();
  }, [article?.is_external, article?.source_url]);

  if (loading) return <PageLoader label="Loading the story…" />;

  if (error || !article) {
    return (
      <div className="container-page py-16">
        <ErrorState message={error || 'That story could not be found.'} onRetry={refetch} />
        <div className="mt-6 text-center">
          <Link to="/" className="btn-secondary">
            <Icon name="arrow_back" size={18} />
            Back to the homepage
          </Link>
        </div>
      </div>
    );
  }

  const image = mediaUrl(article.image_url);
  const byline = article.is_external
    ? article.source_author || article.source_name || 'Greek City Times'
    : article.author?.name || 'KK Factor newsroom';

  return (
    <div className="container-page py-6 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-on-surface-variant">
        <Link to="/" className="hover:text-on-surface">Home</Link>
        <Icon name="chevron_right" size={14} />
        {article.category && (
          <>
            <Link to={`/news/${article.category.slug}`} className="hover:text-on-surface">
              {article.category.name}
            </Link>
            <Icon name="chevron_right" size={14} />
          </>
        )}
        <span className="line-clamp-1 text-on-surface/70">{article.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0">
          <header className="mb-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {article.category && (
                <Link to={`/news/${article.category.slug}`} className="badge-category">
                  {article.category.name}
                </Link>
              )}
              {article.is_breaking && (
                <span className="badge-live">
                  <span className="h-1.5 w-1.5 rounded-full bg-live animate-pulse-live" />
                  Breaking
                </span>
              )}
            </div>

            <h1 className="text-headline-lg">{article.title}</h1>

            {article.excerpt && (
              <p className="mt-4 max-w-prose text-body-lg text-on-surface-variant">{article.excerpt}</p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-line py-4 text-sm text-on-surface-variant">
              {/*
                An imported story is bylined to the journalist who wrote it and
                the newsroom that published it — never to the admin account
                that happens to own the record here.
              */}
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-xs font-semibold text-primary">
                  {byline.charAt(0).toUpperCase()}
                </span>
                {byline}
              </span>
              <span aria-hidden="true">·</span>
              <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
              <span aria-hidden="true">·</span>
              <span>{readingTime(article.content)} min read</span>
              <span className="ml-auto flex items-center gap-1">
                <Icon name="visibility" size={16} />
                {article.views}
              </span>
            </div>
          </header>

          {article.is_external && <SourceCredit article={article} />}

          {image && (
            <figure className="mb-8">
              <img src={image} alt="" className="w-full rounded-2xl" />
            </figure>
          )}

          {/*
            Content is sanitised server-side by sanitize-html before it is ever
            stored, so the stored HTML is safe to render here.
          */}
          <div
            className="article-body max-w-prose"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {article.is_external && (
            <footer className="mt-8 rounded-panel border border-line bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">
                This story was written and published by{' '}
                <strong className="text-on-surface">{article.source_name}</strong>
                {article.source_author && <> · {article.source_author}</>}. It appears here with
                their permission.
              </p>
              <a
                href={article.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary mt-4"
              >
                Read it on {hostOf(article.source_url) || article.source_name}
                <Icon name="open_in_new" size={16} />
              </a>
            </footer>
          )}

          {related.length > 0 && (
            <section className="mt-14 border-t border-line pt-8">
              <h2 className="mb-5 text-headline-md font-bold">Related stories</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {related.map((item) => (
                  <ArticleCard key={item.id} article={item} />
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <RadioWidget />
        </aside>
      </div>
    </div>
  );
}

/** The domain, for a link that says where it is going. */
function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Who wrote this, shown before the article rather than after it.
 *
 * A reader who has scrolled past the headline of a republished story should
 * not have to reach the bottom to find out it is not ours.
 */
function SourceCredit({ article }) {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-panel border border-primary/25 bg-primary-soft/40 px-4 py-3">
      <Icon name="newspaper" size={18} className="text-primary" />
      <p className="text-sm text-on-surface">
        Originally published by <strong>{article.source_name}</strong>
        {article.source_author && <> · {article.source_author}</>}
      </p>
      <a
        href={article.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        View the original
        <Icon name="open_in_new" size={14} />
      </a>
    </div>
  );
}

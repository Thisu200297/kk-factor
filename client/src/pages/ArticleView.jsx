import { useCallback } from 'react';
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
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-xs font-semibold text-primary">
                  {(article.author?.name || '?').charAt(0).toUpperCase()}
                </span>
                {article.author?.name || 'KK Factor newsroom'}
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

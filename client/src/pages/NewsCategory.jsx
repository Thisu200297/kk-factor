import { useCallback, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ArticleGrid from '../components/News/ArticleGrid';
import CategoryTabs from '../components/News/CategoryTabs';
import TrendingSidebar from '../components/News/TrendingSidebar';
import RadioWidget from '../components/RadioPlayer/RadioWidget';
import Icon from '../components/common/Icon';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { articlesApi, categoriesApi } from '../utils/api';

export default function NewsCategory() {
  const { slug } = useParams();
  const [page, setPage] = useState(1);

  // A new category always restarts pagination.
  useEffect(() => setPage(1), [slug]);

  const fetchCategories = useCallback(() => categoriesApi.list(), []);
  const categories = useFetch(fetchCategories);

  const fetchArticles = useCallback(
    () => (slug ? articlesApi.byCategory(slug, { page, limit: 12 }) : articlesApi.list({ page, limit: 12 })),
    [slug, page]
  );
  const articles = useFetch(fetchArticles);

  const category = articles.data?.category;
  useDocumentTitle(category?.name || 'News');

  const pagination = articles.data?.pagination;

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mb-5">
        <h1 className="text-headline-lg">{category?.name || 'All news'}</h1>
        {category?.description && (
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">{category.description}</p>
        )}
      </header>

      <div className="mb-5">
        <CategoryTabs categories={categories.data?.items || []} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <ArticleGrid
            articles={articles.data?.items || []}
            loading={articles.loading}
            error={articles.error}
            onRetry={articles.refetch}
            columns={4}
            emptyTitle={`Nothing in ${category?.name || 'this category'} yet`}
            emptyDescription="Check back once the newsroom publishes here."
          />

          {pagination && pagination.totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
              <button
                type="button"
                className="btn-secondary"
                disabled={!pagination.hasPrev}
                onClick={() => {
                  setPage((p) => p - 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <Icon name="chevron_left" size={18} />
                Previous
              </button>

              <span className="px-3 text-sm text-on-surface-variant">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <button
                type="button"
                className="btn-secondary"
                disabled={!pagination.hasNext}
                onClick={() => {
                  setPage((p) => p + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Next
                <Icon name="chevron_right" size={18} />
              </button>
            </nav>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <RadioWidget />
          <TrendingSidebar />
        </aside>
      </div>
    </div>
  );
}

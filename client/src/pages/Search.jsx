import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchBar from '../components/News/SearchBar';
import ArticleGrid from '../components/News/ArticleGrid';
import { useFetch } from '../hooks/useFetch';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { articlesApi } from '../utils/api';
import { EmptyState } from '../components/common/States';

export default function Search() {
  const [params] = useSearchParams();
  const query = (params.get('q') || '').trim();
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [query]);
  useDocumentTitle(query ? `Search: ${query}` : 'Search');

  const fetcher = useCallback(
    () => (query.length >= 2 ? articlesApi.search(query, { page, limit: 12 }) : Promise.resolve(null)),
    [query, page]
  );
  const { data, loading, error, refetch } = useFetch(fetcher, { immediate: query.length >= 2 });

  return (
    <div className="container-page py-6 md:py-10">
      <header className="mx-auto mb-8 max-w-2xl text-center">
        <h1 className="text-headline-lg">Search the newsroom</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Results match headlines, summaries and article bodies.
        </p>
        <div className="mt-6">
          <SearchBar autoFocus />
        </div>
      </header>

      {query.length < 2 ? (
        <EmptyState
          icon="search"
          title="Type at least two characters"
          description="Start typing above and results will appear as you go."
        />
      ) : (
        <>
          <p className="mb-5 text-sm text-on-surface-variant">
            {loading
              ? 'Searching…'
              : `${data?.pagination?.total ?? 0} result${data?.pagination?.total === 1 ? '' : 's'} for “${query}”`}
          </p>

          <ArticleGrid
            articles={data?.items || []}
            loading={loading}
            error={error}
            onRetry={refetch}
            columns={4}
            emptyTitle={`No stories match “${query}”`}
            emptyDescription="Try a shorter phrase or a different keyword."
          />

          {data?.pagination?.totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
              <button
                type="button"
                className="btn-secondary"
                disabled={!data.pagination.hasPrev}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="px-3 text-sm text-on-surface-variant">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={!data.pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

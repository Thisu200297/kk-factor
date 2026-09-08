import ArticleCard from './ArticleCard';
import { GridSkeleton } from '../common/Loader';
import { EmptyState, ErrorState } from '../common/States';

/**
 * Dense responsive grid. `columns` is the count at the widest breakpoint —
 * the smaller steps are derived so cards stay small on every screen.
 */
export default function ArticleGrid({
  articles = [],
  loading = false,
  error = null,
  onRetry,
  skeletonCount = 8,
  emptyTitle = 'No stories yet',
  emptyDescription = 'Once the newsroom publishes, articles will appear here.',
  columns = 4,
}) {
  if (loading) return <GridSkeleton count={skeletonCount} columns={columns} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!articles.length) return <EmptyState icon="newspaper" title={emptyTitle} description={emptyDescription} />;

  const columnClass =
    {
      2: 'grid-cols-1 xs:grid-cols-2',
      3: 'grid-cols-2 md:grid-cols-3',
      4: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
    }[columns] || 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';

  return (
    <div className={`grid gap-3 sm:gap-4 ${columnClass}`}>
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

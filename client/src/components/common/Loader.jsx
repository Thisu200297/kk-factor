import { classNames } from '../../utils/format';

export function Spinner({ className = '', size = 24 }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={classNames('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      style={{ width: size, height: size }}
    />
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-on-surface-variant">
      <Spinner size={32} className="text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Layout-matched placeholders so the page does not jump when data arrives. */
export function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-[16/10] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-2.5 w-16" />
        <div className="skeleton h-3.5 w-full" />
        <div className="skeleton h-3.5 w-2/3" />
        <div className="skeleton h-2.5 w-1/3" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={index} className="flex items-center gap-4">
          <div className="skeleton h-12 w-12 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 8, columns = 4 }) {
  const columnClass =
    {
      2: 'grid-cols-1 xs:grid-cols-2',
      3: 'grid-cols-2 md:grid-cols-3',
      4: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
    }[columns] || 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';

  return (
    <div className={`grid gap-3 sm:gap-4 ${columnClass}`}>
      {Array.from({ length: count }).map((_, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

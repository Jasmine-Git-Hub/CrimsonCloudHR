import { Skeleton } from './ui/skeleton';

/**
 * Layout-shaped placeholder shown while Firestore data loads. Mirrors the real
 * page (header → stat cards → table) so nothing jumps when data arrives.
 */
export function PageSkeleton({ cards = 3, rows = 6 }: { cards?: number; rows?: number }) {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 bg-gray-200" />
        <Skeleton className="h-4 w-72 bg-gray-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <Skeleton className="h-5 w-32 bg-gray-200" />
            <Skeleton className="h-10 w-24 bg-gray-100" />
            <Skeleton className="h-4 w-full bg-gray-100" />
          </div>
        ))}
      </div>

      <TableSkeleton rows={rows} />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex gap-4 px-6 py-4 bg-gray-50">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 bg-gray-200" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-6 py-4 border-t border-gray-50">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1 bg-gray-100" />
          ))}
        </div>
      ))}
    </div>
  );
}

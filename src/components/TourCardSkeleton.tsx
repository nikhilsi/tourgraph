export default function TourCardSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden bg-surface animate-pulse">
      {/* Photo skeleton */}
      <div className="aspect-[3/2] bg-surface-hover" />

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        <div className="h-6 bg-surface-hover rounded w-3/4" />
        <div className="h-4 bg-surface-hover rounded w-1/2" />
        <div className="h-4 bg-surface-hover rounded w-full" />
        <div className="flex gap-3 pt-1">
          <div className="h-4 bg-surface-hover rounded w-12" />
          <div className="h-4 bg-surface-hover rounded w-10" />
          <div className="h-4 bg-surface-hover rounded w-10" />
        </div>
      </div>
    </div>
  );
}

const VendorCardSkeleton = () => (
  <div className="rounded-2xl overflow-hidden border border-border/50 bg-card">
    <div className="aspect-[4/3] bg-muted animate-pulse" />
    <div className="p-3 space-y-2">
      <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
      <div className="h-2.5 w-1/3 rounded-full bg-muted animate-pulse" />
      <div className="h-2.5 w-full rounded bg-muted animate-pulse" />
      <div className="h-2.5 w-5/6 rounded bg-muted animate-pulse" />
      <div className="flex gap-1.5 pt-1">
        <div className="h-6 flex-1 rounded-md bg-muted animate-pulse" />
        <div className="h-6 flex-1 rounded-md bg-muted animate-pulse" />
      </div>
    </div>
  </div>
);

export const VendorCardSkeletonGrid = ({ count = 6 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <VendorCardSkeleton key={`sk-${i}`} />
    ))}
  </>
);

export default VendorCardSkeleton;

import CarCardSkeleton from "./CarCardSkeleton";

export default function CarGridSkeleton({ count = 12, includeFilterBar = false }) {
  return (
    <div aria-busy="true" aria-label="Loading vehicles">
      {includeFilterBar && (
        <div className="sticky top-16 sm:top-18 z-40 bg-slate-50/95 backdrop-blur-md py-3 flex flex-wrap items-center justify-between gap-3 mb-6 border-y border-slate-200 -mx-4 px-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 xl:-mx-16 xl:px-16 min-h-[58px]">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-8 w-36 rounded-full bg-white border border-slate-200 skeleton-shimmer" />
            <div className="h-8 w-44 rounded-full bg-white border border-slate-200 skeleton-shimmer" />
            <div className="h-8 w-44 rounded-full bg-white border border-slate-200 skeleton-shimmer" />
          </div>
          <div className="h-8 w-32 rounded-full bg-white border border-slate-200 skeleton-shimmer" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {Array.from({ length: count }).map((_, idx) => (
          <CarCardSkeleton key={idx} />
        ))}
      </div>
    </div>
  );
}

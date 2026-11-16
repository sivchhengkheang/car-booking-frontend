import CarCardSkeleton from "./CarCardSkeleton";

export default function CarGridSkeleton({ count = 12, includeFilterBar = false }) {
  return (
    <div aria-busy="true" aria-label="Loading vehicles">
      {includeFilterBar && (
        <div className="bg-slate-50 py-3 flex flex-wrap items-center justify-between gap-3 mb-6 border-y border-slate-200 -mx-4 px-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 xl:-mx-16 xl:px-16 min-h-[58px]">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-8 w-36 rounded-full bg-white border border-slate-200 skeleton-shimmer" />
            <div className="h-8 w-44 rounded-full bg-white border border-slate-200 skeleton-shimmer" />
            <div className="h-8 w-44 rounded-full bg-white border border-slate-200 skeleton-shimmer" />
          </div>
          <div className="h-8 w-32 rounded-full bg-white border border-slate-200 skeleton-shimmer" />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
        {Array.from({ length: count }).map((_, idx) => (
          <CarCardSkeleton key={idx} />
        ))}
      </div>
    </div>
  );
}

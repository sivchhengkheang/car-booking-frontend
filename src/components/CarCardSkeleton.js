export default function CarCardSkeleton() {
  return (
    <div className="flex flex-col relative bg-white rounded-2xl border border-slate-200/80 shadow-xs p-2.5 overflow-hidden">
      {/* Photo container skeleton */}
      <div className="relative w-full aspect-[20/15] rounded-xl overflow-hidden skeleton-shimmer">
        {/* Ghost badge top-left */}
        <div className="absolute top-2.5 left-2.5 w-20 h-5 rounded-full bg-white/70 backdrop-blur-xs shadow-xs" />

        {/* Ghost top-right action buttons */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-full bg-white/70 backdrop-blur-xs shadow-xs" />
          <div className="w-7 h-7 rounded-full bg-white/70 backdrop-blur-xs shadow-xs" />
        </div>

        {/* Ghost status badge bottom-left */}
        <div className="absolute bottom-2.5 left-2.5 w-24 h-4.5 rounded-md bg-white/70 backdrop-blur-xs shadow-xs" />
      </div>

      {/* Details info skeleton */}
      <div className="p-2 flex flex-col flex-1 justify-between">
        <div className="mb-3">
          {/* Title & Rating */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="h-4 skeleton-shimmer rounded-md w-3/5" />
            <div className="h-4 skeleton-shimmer rounded-md w-11 shrink-0" />
          </div>

          {/* Subtitle / Specs */}
          <div className="h-3 skeleton-shimmer rounded-md w-4/5" />
        </div>

        {/* Pricing & Quick Add skeleton */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-auto">
          <div>
            <div className="h-5 skeleton-shimmer rounded-md w-16 mb-1" />
            <div className="h-2.5 skeleton-shimmer rounded-md w-20" />
          </div>

          <div className="flex items-center gap-1.5">
            <div className="h-7 w-16 skeleton-shimmer rounded-lg" />
            <div className="h-7 w-16 skeleton-shimmer rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

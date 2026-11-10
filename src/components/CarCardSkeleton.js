export default function CarCardSkeleton() {
  return (
    <div
      className="flex flex-col bg-white rounded-2xl border border-slate-200/90 overflow-hidden"
      aria-hidden="true"
    >
      {/* Fixed 16:10 image slot matching CarCard */}
      <div className="w-full aspect-[16/10] skeleton-shimmer" />

      {/* Body matching CarCard p-3.5 & gap-2.5 */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="h-5 w-2/3 rounded skeleton-shimmer" />
            <div className="h-5 w-10 rounded skeleton-shimmer shrink-0" />
          </div>
          <div className="h-4 w-3/4 rounded skeleton-shimmer mt-1" />
        </div>

        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <div className="h-6 w-20 rounded skeleton-shimmer" />
          <div className="h-7 w-14 rounded-lg skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

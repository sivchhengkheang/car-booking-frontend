import Navbar from "@/components/Navbar";
import Breadcrumb from "@/components/Breadcrumb";
import BookingStepIndicator from "./BookingStepIndicator";

export default function BookingPageSkeleton() {
  return (
    <>
      <Navbar />

      <main
        className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 py-8 relative pb-24 lg:pb-8"
        aria-busy="true"
        aria-label="Loading vehicle details"
      >
        <Breadcrumb
          className="mb-5"
          items={[{ label: "Home", href: "/" }, { label: "Vehicle" }]}
        />

        <BookingStepIndicator currentStep={1} />

        {/* Header & Gallery Skeleton */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <div className="space-y-2">
              <div className="h-4 w-48 rounded skeleton-shimmer" />
              <div className="h-8 w-72 sm:w-96 rounded skeleton-shimmer" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-20 rounded-full skeleton-shimmer" />
              <div className="h-9 w-20 rounded-full skeleton-shimmer" />
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden h-[300px] md:h-[420px] grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-2">
            <div className="row-span-2 h-full w-full skeleton-shimmer" />
            <div className="hidden md:block h-full w-full skeleton-shimmer" />
            <div className="hidden md:block h-full w-full skeleton-shimmer" />
            <div className="hidden md:block h-full w-full skeleton-shimmer" />
            <div className="hidden md:block h-full w-full skeleton-shimmer" />
          </div>
        </div>

        {/* 2-Column Skeleton Matching lg:grid-cols-[1fr_390px] */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-10 items-start">
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl skeleton-shimmer" />
                ))}
              </div>
              <div className="h-10 w-full rounded skeleton-shimmer" />
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-7 w-28 rounded-lg skeleton-shimmer" />
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 h-80 skeleton-shimmer" />
          </div>

          {/* Sticky Sidebar Skeleton */}
          <div className="sticky top-24 w-full">
            <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl space-y-4">
              <div className="h-8 w-32 rounded skeleton-shimmer" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-12 rounded-xl skeleton-shimmer" />
                <div className="h-12 rounded-xl skeleton-shimmer" />
              </div>
              <div className="h-28 rounded-xl skeleton-shimmer" />
              <div className="h-11 w-full rounded-xl skeleton-shimmer" />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

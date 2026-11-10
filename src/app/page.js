import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import CarGridSkeleton from "@/components/CarGridSkeleton";
import FleetLoader from "./_components/FleetLoader";

export const dynamic = "force-dynamic";

export default function HomePage({ searchParams }) {
  return (
    <>
      {/* Static Navigation Shell — Renders Instantly */}
      <Navbar />

      <main className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 pb-10 max-w-[1920px] mx-auto flex-1">
        {/* Static Page Header — Fixed minimum height prevents shift */}
        <div className="pt-5 pb-3 flex flex-col sm:flex-row sm:items-end justify-between gap-2 min-h-[72px]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Car rentals in Cambodia
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Instant 15-min hold · KHQR &amp; card payment · Free 24h cancellation
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Phnom Penh · Siem Reap · Sihanoukville
          </span>
        </div>

        {/* Non-blocking Streaming Boundary — Immediate Skeleton Fallback */}
        <Suspense fallback={<CarGridSkeleton includeFilterBar count={12} />}>
          <FleetLoader searchParams={searchParams} />
        </Suspense>
      </main>

      {/* Static Footer Shell */}
      <footer className="border-t border-slate-200 py-10 mt-16 bg-slate-900 text-slate-400 text-xs">
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 max-w-[1920px] mx-auto flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="font-semibold text-white mb-2.5 text-xs uppercase tracking-wider">Locations</div>
              <p className="mb-1.5">Phnom Penh</p>
              <p className="mb-1.5">Siem Reap</p>
              <p className="mb-1.5">Sihanoukville</p>
              <p>Battambang</p>
            </div>
            <div>
              <div className="font-semibold text-white mb-2.5 text-xs uppercase tracking-wider">Rentals</div>
              <p className="mb-1.5">15-minute checkout hold</p>
              <p className="mb-1.5">Free 24h cancellation</p>
              <p className="mb-1.5">Insurance included</p>
              <p>24/7 roadside support</p>
            </div>
            <div>
              <div className="font-semibold text-white mb-2.5 text-xs uppercase tracking-wider">Payments</div>
              <p className="mb-1.5">KHQR (Bakong, ABA, Wing)</p>
              <p className="mb-1.5">Visa &amp; Mastercard</p>
              <p>Refundable deposit</p>
            </div>
            <div>
              <div className="font-semibold text-white mb-2.5 text-xs uppercase tracking-wider">Resources</div>
              <a
                href="/flowchart/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-1.5 text-slate-400 hover:text-white transition-colors no-underline"
              >
                System Flowchart
              </a>
              <p className="mb-1.5">KOOMPI ID Sign In</p>
            </div>
          </div>

          <div className="h-px bg-slate-800" />

          <div className="flex justify-between items-center flex-wrap gap-4 text-slate-500 text-[11px]">
            <p>© 2026 DriveKH · Phnom Penh, Cambodia</p>
            <div className="flex items-center gap-4">
              <span>English (US)</span>
              <span>USD ($)</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

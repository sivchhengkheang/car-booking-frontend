"use client";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CarCard from "@/components/CarCard";
import { useBasket } from "@/context/BasketContext";

export default function SavedCarsPage() {
  const { wishlist } = useBasket();

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Saved Vehicles &amp; Wishlist
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Your saved collection of favourite cars across Cambodia
            </p>
          </div>

          <Link
            href="/compare"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all no-underline shrink-0"
          >
            <span>⚖️ Compare Vehicles</span>
          </Link>
        </div>

        {wishlist.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl shadow-xs max-w-lg mx-auto my-12">
            <div className="text-5xl mb-4">🤍</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No saved vehicles yet</h3>
            <p className="text-xs text-slate-500 mb-6">
              Click the heart icon on any vehicle card to save it for your upcoming travels.
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full shadow-md transition-all no-underline inline-block"
            >
              Explore Vehicles
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlist.map((car, idx) => (
              <CarCard key={car._id || car.id || idx} car={car} index={idx} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

"use client";
import Link from "next/link";
import { Heart, Scale } from "lucide-react";
import Navbar from "@/components/Navbar";
import CarCard from "@/components/CarCard";
import { useBasket } from "@/context/BasketContext";

export default function SavedCarsPage() {
  const { wishlist } = useBasket();

  return (
    <>
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Saved Cars</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {wishlist.length} {wishlist.length === 1 ? "vehicle" : "vehicles"} saved
            </p>
          </div>

          <Link
            href="/compare"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs no-underline shrink-0"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Compare</span>
          </Link>
        </div>

        {wishlist.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl max-w-md mx-auto my-10">
            <Heart className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No saved cars</h3>
            <p className="text-xs text-slate-500 mb-5">
              Tap the heart icon on any listing to save it.
            </p>
            <Link
              href="/"
              className="px-5 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold rounded-full no-underline inline-block"
            >
              Browse cars
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {wishlist.map((car, idx) => (
              <CarCard key={car._id || car.id || idx} car={car} index={idx} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

"use client";
import Link from "next/link";
import { Scale, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useBasket } from "@/context/BasketContext";
import { getCarPhotoUrl } from "@/lib/api";

export default function ComparePage() {
  const { compareList, toggleCompare, clearCompare, addToBasket } = useBasket();

  const handleBookNow = (car) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const ret = new Date();
    ret.setDate(ret.getDate() + 4);

    addToBasket({
      car,
      startDate: tomorrow.toISOString(),
      endDate: ret.toISOString(),
      addOns: [],
    });
  };

  return (
    <>
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compare Cars</h1>
            <p className="text-xs text-slate-500 mt-0.5">Side-by-side specifications</p>
          </div>

          {compareList.length > 0 && (
            <button
              type="button"
              onClick={clearCompare}
              className="text-xs text-slate-600 hover:text-rose-600 font-semibold px-3.5 py-2 border border-slate-200 bg-white rounded-xl cursor-pointer"
            >
              Clear all ({compareList.length})
            </button>
          )}
        </div>

        {compareList.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl max-w-md mx-auto my-10">
            <Scale className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No cars to compare</h3>
            <p className="text-xs text-slate-500 mb-5">
              Select up to 3 vehicles to compare specs side-by-side.
            </p>
            <Link
              href="/"
              className="px-5 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold rounded-full no-underline inline-block"
            >
              Browse cars
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <th className="p-4 font-semibold text-slate-400 uppercase tracking-wider w-44">
                    Vehicle
                  </th>
                  {compareList.map((car, idx) => (
                    <th key={car._id || idx} className="p-4 w-60 align-top">
                      <div className="relative">
                        <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-100 mb-2.5">
                          <img
                            src={getCarPhotoUrl(car.photos?.[0], idx)}
                            alt={car.modelName || "Car"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleCompare(car)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer shadow-xs"
                          aria-label="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <h4 className="font-bold text-sm text-slate-900">
                          {car.brand || car.make} {car.modelName || car.model}
                        </h4>
                        <div className="text-xs font-semibold text-blue-600 mt-0.5">
                          ${car.pricePerDay || 35} / day
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBookNow(car)}
                          className="w-full mt-2.5 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Reserve
                        </button>
                      </div>
                    </th>
                  ))}
                  {[...Array(Math.max(0, 3 - compareList.length))].map((_, i) => (
                    <th key={`empty-${i}`} className="p-4 w-60 align-middle text-center">
                      <div className="p-6 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-medium">
                        Empty slot
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { label: "Category", val: (c) => c.category || "Sedan" },
                  { label: "Transmission", val: (c) => c.transmission || "Automatic" },
                  { label: "Seats", val: (c) => `${c.seats || 5} seats` },
                  { label: "Fuel", val: (c) => c.fuelType || "Gasoline" },
                  { label: "Location", val: (c) => c.location?.city || "Phnom Penh" },
                  {
                    label: "Rating",
                    val: (c) => (c.averageRating ? `★ ${Number(c.averageRating).toFixed(1)}` : "New"),
                  },
                  { label: "Insurance", val: () => "Included" },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="p-3.5 font-semibold text-slate-600 bg-slate-50/50">{row.label}</td>
                    {compareList.map((car, idx) => (
                      <td key={idx} className="p-3.5 font-medium text-slate-900">
                        {row.val(car)}
                      </td>
                    ))}
                    {[...Array(Math.max(0, 3 - compareList.length))].map((_, i) => (
                      <td key={`empty-${row.label}-${i}`} className="p-3.5 text-slate-300">
                        —
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

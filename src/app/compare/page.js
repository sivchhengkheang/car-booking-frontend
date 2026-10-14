"use client";
import Link from "next/link";
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

      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Side-by-Side Vehicle Comparison
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Compare features, fuel economy, transmission, and pricing to pick the perfect car
            </p>
          </div>

          {compareList.length > 0 && (
            <button
              onClick={clearCompare}
              className="text-xs text-slate-500 hover:text-red-600 font-bold px-3 py-2 border border-slate-300 rounded-xl cursor-pointer transition-colors"
            >
              Clear Comparison ({compareList.length})
            </button>
          )}
        </div>

        {compareList.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl shadow-xs max-w-lg mx-auto my-12">
            <div className="text-5xl mb-4">⚖️</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No vehicles in comparison</h3>
            <p className="text-xs text-slate-500 mb-6">
              Click the scale icon ⚖️ on any vehicle card to compare up to 3 cars side-by-side.
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full shadow-md transition-all no-underline inline-block"
            >
              Explore Vehicles
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-5 font-bold text-slate-400 uppercase tracking-wider w-48">
                    Specification
                  </th>
                  {compareList.map((car, idx) => (
                    <th key={car._id || idx} className="p-5 w-64 align-top">
                      <div className="relative group">
                        <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-100 mb-3 border border-slate-200">
                          <img
                            src={getCarPhotoUrl(car.photos?.[0], idx)}
                            alt={car.modelName || "Car"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={() => toggleCompare(car)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 hover:bg-red-50 text-slate-500 hover:text-red-600 flex items-center justify-center font-bold text-xs cursor-pointer shadow-xs"
                          title="Remove from compare"
                        >
                          ✕
                        </button>
                        <h4 className="font-bold text-base text-slate-900">
                          {car.brand || car.make} {car.modelName || car.model}
                        </h4>
                        <div className="text-sm font-black text-blue-700 mt-1">
                          ${car.pricePerDay || 35} / day
                        </div>
                        <button
                          onClick={() => handleBookNow(car)}
                          className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                        >
                          Add to Basket &amp; Hold
                        </button>
                      </div>
                    </th>
                  ))}
                  {/* Fill empty comparison slots up to 3 */}
                  {[...Array(Math.max(0, 3 - compareList.length))].map((_, i) => (
                    <th key={`empty-${i}`} className="p-5 w-64 align-middle text-center">
                      <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                        <div className="text-2xl mb-1">+</div>
                        <div className="text-[11px] font-bold">Add Car to Compare</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Category</td>
                  {compareList.map((car, idx) => (
                    <td key={idx} className="p-4 font-semibold text-slate-800">
                      {car.category || "Sedan"}
                    </td>
                  ))}
                  {[...Array(Math.max(0, 3 - compareList.length))].map((_, i) => (
                    <td key={`empty-c-${i}`} className="p-4 text-slate-300">—</td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Transmission</td>
                  {compareList.map((car, idx) => (
                    <td key={idx} className="p-4 font-semibold text-slate-800">
                      🕹️ {car.transmission || "Automatic"}
                    </td>
                  ))}
                  {[...Array(Math.max(0, 3 - compareList.length))].map((_, i) => (
                    <td key={`empty-t-${i}`} className="p-4 text-slate-300">—</td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Seating Capacity</td>
                  {compareList.map((car, idx) => (
                    <td key={idx} className="p-4 font-semibold text-slate-800">
                      💺 {car.seats || 5} Seats
                    </td>
                  ))}
                  {[...Array(Math.max(0, 3 - compareList.length))].map((_, i) => (
                    <td key={`empty-s-${i}`} className="p-4 text-slate-300">—</td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Fuel Type</td>
                  {compareList.map((car, idx) => (
                    <td key={idx} className="p-4 font-semibold text-slate-800">
                      ⛽ {car.fuelType || "Gasoline"}
                    </td>
                  ))}
                  {[...Array(Math.max(0, 3 - compareList.length))].map((_, i) => (
                    <td key={`empty-f-${i}`} className="p-4 text-slate-300">—</td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Pick-up Location</td>
                  {compareList.map((car, idx) => (
                    <td key={idx} className="p-4 font-semibold text-slate-800">
                      📍 {car.location?.city || "Phnom Penh, Cambodia"}
                    </td>
                  ))}
                  {[...Array(Math.max(0, 3 - compareList.length))].map((_, i) => (
                    <td key={`empty-l-${i}`} className="p-4 text-slate-300">—</td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Rating &amp; Reviews</td>
                  {compareList.map((car, idx) => (
                    <td key={idx} className="p-4 font-semibold text-slate-800">
                      ★ 4.92 (Verified Host)
                    </td>
                  ))}
                  {[...Array(Math.max(0, 3 - compareList.length))].map((_, i) => (
                    <td key={`empty-r-${i}`} className="p-4 text-slate-300">—</td>
                  ))}
                </tr>

                <tr>
                  <td className="p-4 font-bold text-slate-700 bg-slate-50/50">Included CDW</td>
                  {compareList.map((car, idx) => (
                    <td key={idx} className="p-4 text-emerald-700 font-bold">
                      ✓ Available Upgrade ($15/d)
                    </td>
                  ))}
                  {[...Array(Math.max(0, 3 - compareList.length))].map((_, i) => (
                    <td key={`empty-cdw-${i}`} className="p-4 text-slate-300">—</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

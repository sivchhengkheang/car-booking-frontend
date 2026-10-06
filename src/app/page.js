"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import CategoryBar from "@/components/CategoryBar";
import CarCard from "@/components/CarCard";
import { getCars } from "@/lib/api";

const CITIES = ["All Locations", "Phnom Penh", "Siem Reap", "Sihanoukville", "Battambang"];

export default function HomePage() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  useEffect(() => {
    getCars()
      .then((data) => {
        if (data.success) setCars(data.cars || data.data || []);
        else setError("Could not load vehicles");
      })
      .catch(() => setError("Could not connect to the server"))
      .finally(() => setLoading(false));
  }, []);

  // Filter cars based on selected Category and Location
  const filteredCars = cars.filter((car) => {
    const carCategory = car.category || "Sedan";
    const carCity = car.location?.city || car.location?.address || "Phnom Penh";

    const matchesCategory =
      activeCategory === "ALL" ||
      carCategory.toLowerCase() === activeCategory.toLowerCase() ||
      (activeCategory === "Sedan" && !car.category);

    const matchesLocation =
      selectedLocation === "All Locations" ||
      carCity.toLowerCase().includes(selectedLocation.toLowerCase());

    return matchesCategory && matchesLocation;
  });

  return (
    <>
      {/* Airbnb Header */}
      <Navbar
        onSearchChange={() => setIsFilterModalOpen(true)}
        selectedLocation={selectedLocation}
      />

      {/* Category Icon Bar */}
      <CategoryBar
        activeCategory={activeCategory}
        onSelectCategory={(cat) => setActiveCategory(cat)}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-24">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-[#FF385C] rounded-full animate-spinner mx-auto mb-4" />
            <p className="text-sm text-gray-500">Discovering available vehicles…</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-8 bg-white border border-red-200 rounded-2xl text-center my-8 shadow-sm">
            <p className="text-red-600 font-bold">⚠️ {error}</p>
            <p className="text-gray-500 text-xs mt-2">
              Make sure your backend API server is online on port 5000.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredCars.length === 0 && (
          <div className="p-16 text-center bg-gray-50 rounded-3xl my-8 border border-gray-200">
            <div className="text-5xl mb-4">🚗</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              No vehicles matched your search
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Try clearing filters or selecting another category.
            </p>
            <button
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white border border-gray-300 text-gray-900 hover:bg-gray-100 transition-all cursor-pointer"
              onClick={() => {
                setActiveCategory("ALL");
                setSelectedLocation("All Locations");
              }}
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Airbnb Grid */}
        {!loading && !error && filteredCars.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8 pt-4">
            {filteredCars.map((car, idx) => (
              <CarCard key={car._id || idx} car={car} index={idx} />
            ))}
          </div>
        )}
      </main>

      {/* Location Filter Modal */}
      {isFilterModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsFilterModalOpen(false)}
        >
          <div
            className="bg-white border border-gray-200 rounded-3xl w-full max-w-md p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Select Location</h3>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="bg-transparent border-0 text-gray-400 hover:text-gray-900 text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {CITIES.map((city) => (
                <button
                  key={city}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                    selectedLocation === city
                      ? "bg-red-50 border-[#FF385C] text-[#FF385C]"
                      : "bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100"
                  }`}
                  onClick={() => {
                    setSelectedLocation(city);
                    setIsFilterModalOpen(false);
                  }}
                >
                  <span>📍 {city}</span>
                  {selectedLocation === city && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Airbnb Footer */}
      <footer className="border-t border-gray-200 py-12 mt-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-6">
          <div className="flex justify-between flex-wrap gap-8 text-xs text-gray-600">
            <div>
              <div className="font-bold text-gray-900 mb-3 text-sm">Support</div>
              <p className="mb-2 hover:underline cursor-pointer">Help Center</p>
              <p className="mb-2 hover:underline cursor-pointer">AirCover for Drivers</p>
              <p className="hover:underline cursor-pointer">Anti-discrimination</p>
            </div>
            <div>
              <div className="font-bold text-gray-900 mb-3 text-sm">Hosting</div>
              <p className="mb-2 hover:underline cursor-pointer">List your Vehicle</p>
              <p className="mb-2 hover:underline cursor-pointer">Host Protection Insurance</p>
              <p className="hover:underline cursor-pointer">Host Resources</p>
            </div>
            <div>
              <div className="font-bold text-gray-900 mb-3 text-sm">DriveKH</div>
              <p className="mb-2 hover:underline cursor-pointer">Cambodia's #1 Car Rental</p>
              <p className="mb-2 hover:underline cursor-pointer">KHQR / Baray Payment</p>
              <p className="hover:underline cursor-pointer">Careers & News</p>
            </div>
          </div>

          <div className="h-px bg-gray-200 my-2" />

          <div className="flex justify-between items-center flex-wrap gap-4 text-xs text-gray-500">
            <p>© 2026 DriveKH, Inc. · Terms · Privacy · KHQR Payments</p>
            <div className="flex items-center gap-4">
              <span>🌐 English (US)</span>
              <span>$ USD</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

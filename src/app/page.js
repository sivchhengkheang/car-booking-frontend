"use client";
import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import CarCard from "@/components/CarCard";
import CarCardSkeleton from "@/components/CarCardSkeleton";
import CarMapExplorer from "@/components/CarMapExplorer";
import { getCars } from "@/lib/api";

const CITIES = ["All Locations", "Phnom Penh", "Siem Reap", "Sihanoukville", "Battambang", "Kampot"];

export default function HomePage() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'map'

  // Advanced Filters
  const [searchFilters, setSearchFilters] = useState({
    location: "All Locations",
    startDate: null,
    endDate: null,
    vehicle: "All Types",
  });
  const [maxPrice, setMaxPrice] = useState(150);
  const [transmissionFilter, setTransmissionFilter] = useState("ALL");
  const [fuelFilter, setFuelFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("POPULAR"); // POPULAR, PRICE_ASC, PRICE_DESC, RATING
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  const fetchCars = (filters = searchFilters) => {
    setLoading(true);
    const params = {};
    if (filters.location !== "All Locations") params.city = filters.location;
    if (filters.startDate) params.start = filters.startDate.toISOString();
    if (filters.endDate) params.end = filters.endDate.toISOString();
    if (filters.vehicle !== "All Types") params.category = filters.vehicle;

    getCars(params)
      .then((data) => {
        if (data.success) {
          setCars(data.cars || data.data || []);
        } else {
          setError("Could not load vehicles");
        }
      })
      .catch(() => setError("Could not connect to the server"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const vehicleParam = sp.get("vehicle") || sp.get("category");
      const cityParam = sp.get("city") || sp.get("location");
      if (vehicleParam || cityParam) {
        const initial = {
          location: cityParam || "All Locations",
          startDate: null,
          endDate: null,
          vehicle: vehicleParam || "All Types",
        };
        setSearchFilters(initial);
        if (vehicleParam && vehicleParam !== "All Types") {
          setActiveCategory(vehicleParam);
        }
        fetchCars(initial);
        return;
      }
    }
    fetchCars();
  }, []);

  const handleSearchSubmit = (newFilters) => {
    setSearchFilters(newFilters);
    fetchCars(newFilters);
    if (newFilters.vehicle && newFilters.vehicle !== "All Types") {
      setActiveCategory(newFilters.vehicle);
    } else {
      setActiveCategory("ALL");
    }
  };

  // Filtered & Sorted cars
  const filteredCars = useMemo(() => {
    return cars
      .filter((car) => {
        const carCategory = car.category || "Sedan";
        const selectedVehicle = (searchFilters.vehicle && searchFilters.vehicle !== "All Types")
          ? searchFilters.vehicle
          : activeCategory;

        let matchesCategory = true;
        if (selectedVehicle && selectedVehicle !== "ALL" && selectedVehicle !== "All Types") {
          const sel = selectedVehicle.toLowerCase();
          const cat = carCategory.toLowerCase();
          if (sel === "electric") {
            matchesCategory = cat === "electric" || car.fuelType?.toLowerCase() === "electric";
          } else if (sel === "automatic") {
            matchesCategory = car.transmission === "Automatic";
          } else {
            matchesCategory = cat === sel || cat.includes(sel) || sel.includes(cat);
          }
        }

        const matchesLocation =
          !searchFilters.location ||
          searchFilters.location === "All Locations" ||
          (car.location?.city &&
            car.location.city.toLowerCase().includes(searchFilters.location.toLowerCase()));

        const matchesPrice = (car.pricePerDay || 35) <= maxPrice;

        const matchesTransmission =
          transmissionFilter === "ALL" || car.transmission === transmissionFilter;

        const matchesFuel = fuelFilter === "ALL" || car.fuelType === fuelFilter;

        return matchesCategory && matchesLocation && matchesPrice && matchesTransmission && matchesFuel;
      })
      .sort((a, b) => {
        if (sortBy === "PRICE_ASC") return (a.pricePerDay || 35) - (b.pricePerDay || 35);
        if (sortBy === "PRICE_DESC") return (b.pricePerDay || 35) - (a.pricePerDay || 35);
        if (sortBy === "RATING") return (b.year || 2024) - (a.year || 2024);
        return 0; // POPULAR / Default
      });
  }, [cars, activeCategory, searchFilters.vehicle, searchFilters.location, maxPrice, transmissionFilter, fuelFilter, sortBy]);

  // Curated collections for the home page
  const under35Cars = useMemo(() => {
    return cars.filter((c) => (c.pricePerDay || 35) <= 35).slice(0, 4);
  }, [cars]);

  const luxuryCars = useMemo(() => {
    return cars
      .filter((c) => (c.category === "Luxury" || c.pricePerDay >= 60))
      .slice(0, 4);
  }, [cars]);

  return (
    <>
      <Navbar onSearchSubmit={handleSearchSubmit} initialSearch={searchFilters} />

      {/* Main Content */}
      <main className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 pb-6 max-w-[1920px] mx-auto flex-1">

        {/* Filter & View Mode Controls Bar */}
        <div className="sticky top-20 z-40 bg-white/95 backdrop-blur-md pt-4 pb-4 flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-200 -mx-4 px-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 xl:-mx-16 xl:px-16">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Control */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-xs">
              <span className="text-xs text-slate-400 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-hidden cursor-pointer"
              >
                <option value="POPULAR">Popular</option>
                <option value="PRICE_ASC">Cheapest first</option>
                <option value="PRICE_DESC">Most expensive first</option>
                <option value="RATING">Highest rated</option>
              </select>
            </div>

            {/* Transmission Quick Filter */}
            <div className="flex items-center bg-white border border-slate-200 rounded-full p-0.5 shadow-xs text-xs">
              {["ALL", "Automatic", "Manual"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTransmissionFilter(t)}
                  className={`px-3 py-1 rounded-full font-semibold cursor-pointer transition-colors ${transmissionFilter === t
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  {t === "ALL" ? "All" : t}
                </button>
              ))}
            </div>

            {/* Price slider trigger */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-xs">
              <span className="text-xs text-slate-500">Max price</span>
              <span className="text-xs font-bold text-blue-700">${maxPrice}/day</span>
              <input
                type="range"
                min="20"
                max="250"
                step="5"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-20 sm:w-28 accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Active Vehicle Filter Chip from Navbar */}
            {searchFilters.vehicle && searchFilters.vehicle !== "All Types" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-full">
                <span>🚘 {searchFilters.vehicle}</span>
                <button
                  type="button"
                  onClick={() => {
                    handleSearchSubmit({
                      ...searchFilters,
                      vehicle: "All Types",
                    });
                  }}
                  className="hover:text-blue-900 cursor-pointer text-sm font-black leading-none ml-0.5"
                  title="Remove vehicle filter"
                >
                  ×
                </button>
              </span>
            )}

            {/* Reset Filter Button if applied */}
            {(maxPrice < 150 || transmissionFilter !== "ALL" || fuelFilter !== "ALL" || activeCategory !== "ALL" || (searchFilters.vehicle && searchFilters.vehicle !== "All Types") || (searchFilters.location && searchFilters.location !== "All Locations")) && (
              <button
                onClick={() => {
                  setMaxPrice(150);
                  setTransmissionFilter("ALL");
                  setFuelFilter("ALL");
                  setActiveCategory("ALL");
                  setSortBy("POPULAR");
                  handleSearchSubmit({
                    location: "All Locations",
                    startDate: null,
                    endDate: null,
                    vehicle: "All Types",
                  });
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold px-2 py-1 cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* View Toggle: Grid vs Map */}
          <div className="flex items-center bg-white border border-slate-200 rounded-full p-1 shadow-xs">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${viewMode === "grid"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>▦</span>
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${viewMode === "map"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>🗺️</span>
              <span>Map</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-5 gap-y-7">
            {Array.from({ length: 12 }).map((_, idx) => (
              <CarCardSkeleton key={idx} />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-8 bg-white border border-red-200 rounded-3xl text-center my-8 shadow-sm max-w-lg mx-auto">
            <p className="text-red-600 font-bold mb-2">⚠️ {error}</p>
            <p className="text-slate-500 text-xs">
              Could not connect. Please try again.
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredCars.length === 0 && (
          <div className="p-16 text-center bg-white rounded-3xl my-8 border border-slate-200 shadow-sm max-w-lg mx-auto">
            <div className="text-5xl mb-4">🚗</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              No cars found
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Try changing your price, location, or car type.
            </p>
            <button
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer"
              onClick={() => {
                setActiveCategory("ALL");
                setMaxPrice(150);
                setTransmissionFilter("ALL");
                setFuelFilter("ALL");
                handleSearchSubmit({
                  location: "All Locations",
                  startDate: null,
                  endDate: null,
                  vehicle: "All Types",
                });
              }}
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Main Results: Either Map Split or Grid */}
        {!loading && !error && filteredCars.length > 0 && (
          <>
            {viewMode === "map" ? (
              <CarMapExplorer cars={filteredCars} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-5 gap-y-7">
                {filteredCars.map((car, idx) => (
                  <CarCard key={car._id || idx} car={car} index={idx} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Curated Carousels / Sections on Home (only when viewing all types) */}
        {!loading && !error && (activeCategory === "ALL" || !activeCategory) && (!searchFilters.vehicle || searchFilters.vehicle === "All Types") && viewMode === "grid" && (
          <div className="mt-16 space-y-12">
            {/* Under $35/day Section */}
            {under35Cars.length > 0 && (
              <div className="pt-8 border-t border-slate-200">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Cheap Cars Under $35/day
                    </h2>
                    <p className="text-xs text-slate-500">
                      Good cars for going around town or on a trip
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                  {under35Cars.map((car, idx) => (
                    <CarCard key={`budget-${car._id || idx}`} car={car} index={idx} />
                  ))}
                </div>
              </div>
            )}

            {/* Luxury Collection */}
            {luxuryCars.length > 0 && (
              <div className="pt-8 border-t border-slate-200">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Luxury Cars
                    </h2>
                    <p className="text-xs text-slate-500">
                      Top cars for special trips and events
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                  {luxuryCars.map((car, idx) => (
                    <CarCard key={`lux-${car._id || idx}`} car={car} index={idx + 10} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Professional Automotive Footer */}
      <footer className="border-t border-slate-200 py-12 mt-20 bg-slate-900 text-slate-400 text-xs">
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 max-w-[1920px] mx-auto flex flex-col gap-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="font-bold text-white mb-3 text-sm">Our Locations</div>
              <p className="mb-2 hover:text-white cursor-pointer">Phnom Penh Airport & Downtown</p>
              <p className="mb-2 hover:text-white cursor-pointer">Siem Reap Angkor International</p>
              <p className="mb-2 hover:text-white cursor-pointer">Sihanoukville Coastal Fleet</p>
              <p className="hover:text-white cursor-pointer">Battambang Station</p>
            </div>
            <div>
              <div className="font-bold text-white mb-3 text-sm">List Your Car</div>
              <p className="mb-2 hover:text-white cursor-pointer">Add your car to DriveKH</p>
              <p className="mb-2 hover:text-white cursor-pointer">Car insurance</p>
              <p className="mb-2 hover:text-white cursor-pointer">See your earnings</p>
              <p className="hover:text-white cursor-pointer">Login with KID</p>
            </div>
            <div>
              <div className="font-bold text-white mb-3 text-sm">Safety & Rules</div>
              <p className="mb-2 hover:text-white cursor-pointer">Full damage cover</p>
              <p className="mb-2 hover:text-white cursor-pointer">Car held for 15 min</p>
              <p className="mb-2 hover:text-white cursor-pointer">Cancel free (1 day before)</p>
              <p className="hover:text-white cursor-pointer">Help on the road, anytime</p>
            </div>
            <div>
              <div className="font-bold text-white mb-3 text-sm">How to Pay</div>
              <p className="mb-2 hover:text-white cursor-pointer">Pay with Baray</p>
              <p className="mb-2 hover:text-white cursor-pointer">KHQR (ABA, ACLEDA, Wing)</p>
              <p className="mb-2 hover:text-white cursor-pointer">Get receipt fast</p>
              <p className="hover:text-white cursor-pointer">Safe deposit</p>
            </div>
          </div>

          <div className="h-px bg-slate-800" />

          <div className="flex justify-between items-center flex-wrap gap-4 text-slate-500 text-[11px]">
            <p>© 2026 DriveKH Technologies Ltd. · Phnom Penh, Cambodia · Car Rental in Cambodia</p>
            <div className="flex items-center gap-4">
              <span>🇰🇭 Cambodia</span>
              <span>English (US)</span>
              <span>$ USD / ៛ KHR</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

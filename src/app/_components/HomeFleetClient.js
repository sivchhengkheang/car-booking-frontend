"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { LayoutGrid, Map as MapIcon, X, AlertCircle, Car } from "lucide-react";
import CarCard from "@/components/CarCard";
import CarGridSkeleton from "@/components/CarGridSkeleton";
import CarMapExplorer from "@/components/CarMapExplorer";
import { getCars } from "@/lib/api";
import { useSearch } from "@/context/SearchContext";

function serializeQuery(filters) {
  return JSON.stringify({
    location: filters.location || "All Locations",
    vehicle: filters.vehicle || "All Types",
    start: filters.startDate ? new Date(filters.startDate).toISOString() : null,
    end: filters.endDate ? new Date(filters.endDate).toISOString() : null,
  });
}

export default function HomeFleetClient({ initialCars = null, initialQuery = null }) {
  const {
    searchFilters: contextFilters,
    setSearchFilters: setContextFilters,
    isHydrated,
  } = useSearch();

  const [cars, setCars] = useState(() => initialCars || []);
  const [loading, setLoading] = useState(() => initialCars === null);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(() =>
    initialQuery?.vehicle && initialQuery.vehicle !== "All Types" ? initialQuery.vehicle : "ALL"
  );
  const [viewMode, setViewMode] = useState("grid");

  const [searchFilters, setSearchFilters] = useState(() => ({
    location: initialQuery?.location || "All Locations",
    startDate: initialQuery?.start ? new Date(initialQuery.start) : null,
    endDate: initialQuery?.end ? new Date(initialQuery.end) : null,
    vehicle: initialQuery?.vehicle || "All Types",
  }));

  const [maxPrice, setMaxPrice] = useState(150);
  const [transmissionFilter, setTransmissionFilter] = useState("ALL");
  const [fuelFilter, setFuelFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("POPULAR");

  const lastFetchedQueryRef = useRef(
    initialCars !== null
      ? serializeQuery({
          location: initialQuery?.location || "All Locations",
          vehicle: initialQuery?.vehicle || "All Types",
          startDate: initialQuery?.start || null,
          endDate: initialQuery?.end || null,
        })
      : null
  );

  const fetchCars = useCallback((filters) => {
    setLoading(true);
    setError(null);
    const params = {};
    if (filters.location && filters.location !== "All Locations") params.city = filters.location;
    if (filters.startDate) params.start = new Date(filters.startDate).toISOString();
    if (filters.endDate) params.end = new Date(filters.endDate).toISOString();
    if (filters.vehicle && filters.vehicle !== "All Types") params.category = filters.vehicle;

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
  }, []);

  // Sync with SearchContext updates triggered by Navbar or initial hydration
  useEffect(() => {
    if (!isHydrated) return;

    const nextKey = serializeQuery(contextFilters);
    if (lastFetchedQueryRef.current === nextKey) return;

    lastFetchedQueryRef.current = nextKey;
    setSearchFilters(contextFilters);
    setActiveCategory(
      contextFilters.vehicle && contextFilters.vehicle !== "All Types"
        ? contextFilters.vehicle
        : "ALL"
    );
    fetchCars(contextFilters);
  }, [isHydrated, contextFilters, fetchCars]);

  const handleSearchUpdate = useCallback(
    (newFilters) => {
      const nextKey = serializeQuery(newFilters);
      lastFetchedQueryRef.current = nextKey;
      setSearchFilters(newFilters);
      if (setContextFilters) {
        setContextFilters(newFilters);
      }
      setActiveCategory(
        newFilters.vehicle && newFilters.vehicle !== "All Types" ? newFilters.vehicle : "ALL"
      );
      fetchCars(newFilters);

      if (typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search);
        if (newFilters.startDate) sp.set("start", new Date(newFilters.startDate).toISOString());
        else {
          sp.delete("start");
          sp.delete("startDate");
        }
        if (newFilters.endDate) sp.set("end", new Date(newFilters.endDate).toISOString());
        else {
          sp.delete("end");
          sp.delete("endDate");
        }
        if (newFilters.location && newFilters.location !== "All Locations") {
          sp.set("city", newFilters.location);
        } else {
          sp.delete("city");
          sp.delete("location");
        }
        if (newFilters.vehicle && newFilters.vehicle !== "All Types") {
          sp.set("vehicle", newFilters.vehicle);
        } else {
          sp.delete("vehicle");
          sp.delete("category");
        }
        const newQuery = sp.toString();
        const newUrl = newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname;
        window.history.replaceState(null, "", newUrl);
      }
    },
    [fetchCars, setContextFilters]
  );

  const filteredCars = useMemo(() => {
    return cars
      .filter((car) => {
        const carCategory = car.category || "Sedan";
        const selectedVehicle =
          searchFilters.vehicle && searchFilters.vehicle !== "All Types"
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
        if (sortBy === "RATING")
          return (b.averageRating || b.rating || 0) - (a.averageRating || a.rating || 0);
        return 0;
      });
  }, [cars, activeCategory, searchFilters.vehicle, searchFilters.location, maxPrice, transmissionFilter, fuelFilter, sortBy]);

  const under35Cars = useMemo(() => {
    return cars.filter((c) => (c.pricePerDay || 35) <= 35).slice(0, 4);
  }, [cars]);

  const luxuryCars = useMemo(() => {
    return cars.filter((c) => c.category === "Luxury" || c.pricePerDay >= 60).slice(0, 4);
  }, [cars]);

  const resetAllFilters = () => {
    setMaxPrice(150);
    setTransmissionFilter("ALL");
    setFuelFilter("ALL");
    setActiveCategory("ALL");
    setSortBy("POPULAR");
    handleSearchUpdate({
      location: "All Locations",
      startDate: null,
      endDate: null,
      vehicle: "All Types",
    });
  };

  const hasActiveFilters =
    maxPrice < 150 ||
    transmissionFilter !== "ALL" ||
    fuelFilter !== "ALL" ||
    activeCategory !== "ALL" ||
    (searchFilters.vehicle && searchFilters.vehicle !== "All Types") ||
    (searchFilters.location && searchFilters.location !== "All Locations");

  return (
    <>
      {/* Filter & View Mode Controls Bar */}
      <div className="sticky top-16 sm:top-18 z-40 bg-slate-50/95 backdrop-blur-md py-3 flex flex-wrap items-center justify-between gap-3 mb-6 border-y border-slate-200 -mx-4 px-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 xl:-mx-16 xl:px-16 min-h-[58px]">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort Control */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1.5">
            <span className="text-xs text-slate-400">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent border-0 focus:outline-hidden cursor-pointer"
            >
              <option value="POPULAR">Popular</option>
              <option value="PRICE_ASC">Price: Low to high</option>
              <option value="PRICE_DESC">Price: High to low</option>
              <option value="RATING">Top rated</option>
            </select>
          </div>

          {/* Transmission Filter */}
          <div className="flex items-center bg-white border border-slate-200 rounded-full p-0.5 text-xs">
            {["ALL", "Automatic", "Manual"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTransmissionFilter(t)}
                className={`px-3 py-1 rounded-full font-medium cursor-pointer transition-colors ${
                  transmissionFilter === t
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t === "ALL" ? "All" : t}
              </button>
            ))}
          </div>

          {/* Max Price Slider */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5">
            <span className="text-xs text-slate-500">Up to</span>
            <span className="text-xs font-semibold text-slate-900 tabular-nums">${maxPrice}/d</span>
            <input
              type="range"
              min="20"
              max="250"
              step="5"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-20 sm:w-24 accent-blue-600 cursor-pointer"
              aria-label="Maximum daily price"
            />
          </div>

          {/* Active Vehicle Chip */}
          {searchFilters.vehicle && searchFilters.vehicle !== "All Types" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-full">
              <span>{searchFilters.vehicle}</span>
              <button
                type="button"
                onClick={() =>
                  handleSearchUpdate({
                    ...searchFilters,
                    vehicle: "All Types",
                  })
                }
                className="hover:text-blue-900 cursor-pointer"
                aria-label="Remove vehicle filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs text-blue-600 hover:underline font-semibold px-2 py-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-white border border-slate-200 rounded-full p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === "grid"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === "map"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Map</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && <CarGridSkeleton count={12} />}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 bg-white border border-rose-200 rounded-2xl text-center my-8 max-w-md mx-auto">
          <AlertCircle className="w-6 h-6 text-rose-600 mx-auto mb-2" />
          <p className="text-sm text-rose-700 font-semibold">{error}</p>
          <p className="text-slate-500 text-xs mt-1">Please try refreshing the page.</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredCars.length === 0 && (
        <div className="p-10 text-center bg-white rounded-2xl my-8 border border-slate-200 max-w-md mx-auto">
          <Car className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No matching vehicles</h3>
          <p className="text-xs text-slate-500 mb-4">
            {searchFilters.location && searchFilters.location !== "All Locations"
              ? `No cars available in ${searchFilters.location} for these dates.`
              : maxPrice < 80
              ? `No vehicles under $${maxPrice}/day.`
              : transmissionFilter !== "ALL"
              ? `No ${transmissionFilter.toLowerCase()} vehicles match.`
              : "Adjust your filters or dates to see more options."}
          </p>
          <button
            type="button"
            className="px-4 py-2 rounded-full text-xs font-semibold bg-slate-900 hover:bg-blue-600 text-white transition-colors cursor-pointer"
            onClick={resetAllFilters}
          >
            Reset filters
          </button>
        </div>
      )}

      {/* Main Results */}
      {!loading && !error && filteredCars.length > 0 && (
        <>
          {viewMode === "map" ? (
            <CarMapExplorer cars={filteredCars} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {filteredCars.map((car, idx) => (
                <CarCard key={car._id || idx} car={car} index={idx} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Curated Collections */}
      {!loading &&
        !error &&
        (activeCategory === "ALL" || !activeCategory) &&
        (!searchFilters.vehicle || searchFilters.vehicle === "All Types") &&
        viewMode === "grid" && (
          <div className="mt-14 space-y-10">
            {under35Cars.length > 0 && (
              <section className="pt-8 border-t border-slate-200">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-slate-900">Under $35 / day</h2>
                  <p className="text-xs text-slate-500">Budget-friendly daily rentals</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {under35Cars.map((car, idx) => (
                    <CarCard key={`budget-${car._id || idx}`} car={car} index={idx} />
                  ))}
                </div>
              </section>
            )}

            {luxuryCars.length > 0 && (
              <section className="pt-8 border-t border-slate-200">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-slate-900">Luxury</h2>
                  <p className="text-xs text-slate-500">Premium comfort &amp; features</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {luxuryCars.map((car, idx) => (
                    <CarCard key={`lux-${car._id || idx}`} car={car} index={idx + 10} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
    </>
  );
}

"use client";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const SearchContext = createContext({
  searchFilters: {
    location: "All Locations",
    startDate: null,
    endDate: null,
    vehicle: "All Types",
  },
  startDate: null,
  endDate: null,
  location: "All Locations",
  vehicle: "All Types",
  setDateRange: () => {},
  setSearchFilters: () => {},
  clearDates: () => {},
  getBookingUrl: () => "",
  isHydrated: false,
});

const STORAGE_KEY = "drivekh_search_filters";

function safeParseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export function SearchProvider({ children }) {
  const [filters, setFilters] = useState({
    location: "All Locations",
    startDate: null,
    endDate: null,
    vehicle: "All Types",
  });
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate on client mount from URL search params (default is strictly empty)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Remove legacy stored dates so fresh visits are always empty by default
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("dkh_trip_dates");
    } catch (e) {}

    let initial = {
      location: "All Locations",
      startDate: null,
      endDate: null,
      vehicle: "All Types",
    };

    // Only populate dates/filters if explicitly provided in URL search params
    try {
      const sp = new URLSearchParams(window.location.search);
      const urlCity = sp.get("city") || sp.get("location");
      const urlVehicle = sp.get("vehicle") || sp.get("category");
      const urlStart = sp.get("start") || sp.get("startDate");
      const urlEnd = sp.get("end") || sp.get("endDate");

      if (urlCity) initial.location = urlCity;
      if (urlVehicle) initial.vehicle = urlVehicle;
      if (urlStart) {
        const d = safeParseDate(urlStart);
        if (d) initial.startDate = d;
      }
      if (urlEnd) {
        const d = safeParseDate(urlEnd);
        if (d) initial.endDate = d;
      }
    } catch (e) {
      console.warn("Could not read search filters from URL", e);
    }

    setFilters(initial);
    setIsHydrated(true);
  }, []);

  const setDateRange = useCallback(({ startDate, endDate }) => {
    const s = safeParseDate(startDate);
    const e = safeParseDate(endDate);
    setFilters((prev) => {
      const prevSMs = prev.startDate?.getTime() || null;
      const prevEMs = prev.endDate?.getTime() || null;
      const newSMs = s?.getTime() || null;
      const newEMs = e?.getTime() || null;
      if (prevSMs === newSMs && prevEMs === newEMs) return prev;
      return {
        ...prev,
        startDate: s,
        endDate: e,
      };
    });
  }, []);

  const setSearchFilters = useCallback((newFilters) => {
    setFilters((prev) => {
      const s = newFilters.startDate !== undefined ? safeParseDate(newFilters.startDate) : prev.startDate;
      const e = newFilters.endDate !== undefined ? safeParseDate(newFilters.endDate) : prev.endDate;
      return {
        location: newFilters.location || prev.location,
        vehicle: newFilters.vehicle || prev.vehicle,
        startDate: s,
        endDate: e,
      };
    });
  }, []);

  const clearDates = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      startDate: null,
      endDate: null,
    }));
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      sp.delete("start");
      sp.delete("startDate");
      sp.delete("end");
      sp.delete("endDate");
      const newQuery = sp.toString();
      const newUrl = newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname;
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  const getBookingUrl = useCallback(
    (carId) => {
      if (!carId) return "/booking";
      const params = new URLSearchParams();
      params.set("carId", carId);
      if (filters.startDate) {
        params.set("startDate", filters.startDate.toISOString());
      }
      if (filters.endDate) {
        params.set("endDate", filters.endDate.toISOString());
      }
      return `/booking?${params.toString()}`;
    },
    [filters.startDate, filters.endDate]
  );

  const value = useMemo(
    () => ({
      searchFilters: filters,
      startDate: filters.startDate,
      endDate: filters.endDate,
      location: filters.location,
      vehicle: filters.vehicle,
      setDateRange,
      setSearchFilters,
      clearDates,
      getBookingUrl,
      isHydrated,
    }),
    [filters, setDateRange, setSearchFilters, clearDates, getBookingUrl, isHydrated]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  return useContext(SearchContext);
}

"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Loader2,
  LogIn,
  ShoppingBag,
  MapPin,
  Heart,
  User,
  Calendar,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCars, getMe } from "@/lib/api";
import { redirectToKID, session } from "@/lib/kid-auth";
import { useBasket } from "@/context/BasketContext";
import { useSearch } from "@/context/SearchContext";
import CalendarMonth from "@/components/CalendarMonth";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const CITIES = ["All Locations", "Phnom Penh", "Siem Reap", "Sihanoukville", "Battambang"];
const VEHICLE_TYPES = ["All Types", "Sedan", "SUV", "Luxury", "Electric", "Van", "Truck"];

const VEHICLE_META = {
  "All Types": { label: "All Cars" },
  "Sedan": { label: "Sedans" },
  "SUV": { label: "SUV & 4x4" },
  "Luxury": { label: "Luxury" },
  "Electric": { label: "Electric" },
  "Van": { label: "Vans" },
  "Truck": { label: "Pickups" },
};

export default function Navbar({ onSearchSubmit, initialSearch = {} }) {
  const router = useRouter();
  const { itemCount, openDrawer, remainingHoldSeconds } = useBasket();
  const {
    searchFilters,
    setDateRange: setContextDateRange,
    setSearchFilters: setContextFilters,
  } = useSearch();

  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const [searchExpanded, setSearchExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(null); // 'where', 'dates', 'vehicle'

  const [location, setLocation] = useState(initialSearch.location || searchFilters?.location || "All Locations");
  const [startDate, setStartDate] = useState(
    initialSearch.startDate !== undefined ? initialSearch.startDate : (searchFilters?.startDate || null)
  );
  const [endDate, setEndDate] = useState(
    initialSearch.endDate !== undefined ? initialSearch.endDate : (searchFilters?.endDate || null)
  );
  const [vehicle, setVehicle] = useState(initialSearch.vehicle || searchFilters?.vehicle || "All Types");
  const [availableVehicles, setAvailableVehicles] = useState(VEHICLE_TYPES);

  useEffect(() => {
    if (initialSearch.location !== undefined) {
      setLocation(initialSearch.location);
    } else if (searchFilters?.location !== undefined) {
      setLocation(searchFilters.location);
    }
  }, [initialSearch.location, searchFilters?.location]);

  useEffect(() => {
    if (initialSearch.startDate !== undefined) {
      setStartDate(initialSearch.startDate);
    } else if (searchFilters?.startDate !== undefined) {
      setStartDate(searchFilters.startDate);
    }
  }, [initialSearch.startDate, searchFilters?.startDate]);

  useEffect(() => {
    if (initialSearch.endDate !== undefined) {
      setEndDate(initialSearch.endDate);
    } else if (searchFilters?.endDate !== undefined) {
      setEndDate(searchFilters.endDate);
    }
  }, [initialSearch.endDate, searchFilters?.endDate]);

  useEffect(() => {
    if (initialSearch.vehicle !== undefined) {
      setVehicle(initialSearch.vehicle);
    } else if (searchFilters?.vehicle !== undefined) {
      setVehicle(searchFilters.vehicle);
    }
  }, [initialSearch.vehicle, searchFilters?.vehicle]);

  const navRef = useRef(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;

    async function loadAccount() {
      let fallbackUser = session.getUser();
      if (!fallbackUser) {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            fallbackUser = JSON.parse(storedUser);
          } catch {}
        }
      }
      if (active && fallbackUser) {
        setUser(fallbackUser);
      }

      const token =
        localStorage.getItem("token") || sessionStorage.getItem("kid_access_token");
      if (!token) return;

      try {
        const res = await getMe(token);
        if (active && res?.success && res.user) {
          const merged = { ...(fallbackUser || {}), ...res.user };
          setUser(merged);
          localStorage.setItem("user", JSON.stringify(merged));
        }
      } catch {
        // Keep fallback user
      }
    }

    Promise.resolve().then(() => {
      if (active) void loadAccount();
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setSearchExpanded(false);
        setActiveTab(null);
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      getCars({ start: startDate.toISOString(), end: endDate.toISOString() })
        .then((res) => {
          if (res.success && res.cars) {
            const types = new Set(res.cars.map((c) => c.category || "Sedan"));
            setAvailableVehicles(["All Types", ...Array.from(types)]);
            if (!types.has(vehicle) && vehicle !== "All Types") {
              setVehicle("All Types");
            }
          }
        });
    } else {
      setAvailableVehicles(VEHICLE_TYPES);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    const handleResetLoading = () => setSigningIn(false);

    window.addEventListener("pageshow", handleResetLoading);
    window.addEventListener("focus", handleResetLoading);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") setSigningIn(false);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", handleResetLoading);
      window.removeEventListener("focus", handleResetLoading);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleKidSignIn = async () => {
    setSigningIn(true);
    const safetyTimer = setTimeout(() => setSigningIn(false), 6000);

    try {
      await redirectToKID();
    } catch (err) {
      console.error("KID sign in error:", err);
      clearTimeout(safetyTimer);
      setSigningIn(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      const kidRefresh = session.getRefreshToken();
      if (kidRefresh) {
        fetch("/api/auth/kid/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: kidRefresh }),
        }).catch(() => {});
      }
      session.clear();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    setUser(null);
    setDropdownOpen(false);
    window.location.href = "/";
  };

  const handleSearch = (e, overrides = {}) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setSearchExpanded(false);
    setActiveTab(null);
    const searchData = {
      location,
      startDate,
      endDate,
      vehicle,
      ...(overrides && typeof overrides === "object" ? overrides : {}),
    };
    if (setContextFilters) {
      setContextFilters(searchData);
    }
    if (onSearchSubmit) {
      onSearchSubmit(searchData);
    } else {
      const q = new URLSearchParams();
      if (searchData.location && searchData.location !== "All Locations") q.set("city", searchData.location);
      if (searchData.startDate) q.set("start", searchData.startDate.toISOString());
      if (searchData.endDate) q.set("end", searchData.endDate.toISOString());
      if (searchData.vehicle && searchData.vehicle !== "All Types") q.set("vehicle", searchData.vehicle);
      router.push(`/?${q.toString()}`);
    }
  };

  const handleSelectLocation = (selectedCity) => {
    setLocation(selectedCity);
    handleSearch(null, { location: selectedCity });
  };

  const handleSelectVehicle = (selectedType) => {
    setVehicle(selectedType);
    handleSearch(null, { vehicle: selectedType });
  };

  const toggleTab = (tab) => {
    if (searchExpanded && activeTab === tab) {
      setSearchExpanded(false);
      setActiveTab(null);
    } else {
      setSearchExpanded(true);
      setActiveTab(tab);
    }
  };

  const buildDaysForMonth = useCallback((offsetMonth = 0) => {
    const targetDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offsetMonth, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < first; i++) days.push(null);
    for (let d = 1; d <= total; d++) days.push(new Date(year, month, d));
    return { days, year, month };
  }, [viewDate]);

  const getRentalDaysCount = () => {
    if (!startDate || !endDate) return 0;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  };

  const handleApplyDatesAndClose = () => {
    setSearchExpanded(false);
    setActiveTab(null);
    handleSearch(null, { location, startDate, endDate, vehicle });
  };

  const handleClearDates = () => {
    setStartDate(null);
    setEndDate(null);
    if (setContextDateRange) {
      setContextDateRange({ startDate: null, endDate: null });
    }
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
    handleSearch(null, { startDate: null, endDate: null });
  };

  const handleDayClick = (day) => {
    if (!day || day < today) return;
    if (!startDate || (startDate && endDate)) {
      setStartDate(day);
      setEndDate(null);
    } else {
      if (day < startDate) {
        setStartDate(day);
        setEndDate(null);
      } else {
        const selectedStart = startDate;
        const selectedEnd = day;
        setEndDate(day);
        if (setContextDateRange) {
          setContextDateRange({ startDate: selectedStart, endDate: selectedEnd });
        }

        setTimeout(() => {
          setSearchExpanded(false);
          setActiveTab(null);
          handleSearch(null, {
            startDate: selectedStart,
            endDate: selectedEnd,
          });
        }, 250);
      }
    }
  };

  const prevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  const nextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const month1 = buildDaysForMonth(0);
  const month2 = buildDaysForMonth(1);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 h-16 sm:h-18 flex items-center justify-between gap-4 max-w-[1920px] mx-auto" ref={navRef}>
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-1.5 text-lg font-extrabold text-slate-900 tracking-tight no-underline shrink-0">
          <img src="/blue-logo.png" alt="DriveKH" width={40} height={40} className="object-contain" />
          <span>Drive<span className="text-blue-600">KH</span></span>
        </Link>

        {/* Compact Search Pill */}
        <div className="flex-1 flex justify-center relative max-w-xl">
          <div className="flex items-center bg-white border border-slate-200 rounded-full shadow-xs hover:shadow-sm transition-all w-full pl-5 pr-1.5 py-1.5">
            <button
              type="button"
              className="flex flex-col flex-1 text-left cursor-pointer px-1"
              onClick={() => toggleTab("where")}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Where</span>
              <span className="text-xs font-semibold text-slate-800 truncate">{location}</span>
            </button>

            <div className="w-px h-6 bg-slate-200 mx-2.5" />

            <button
              type="button"
              className="flex flex-col flex-1 text-left cursor-pointer px-1"
              onClick={() => toggleTab("dates")}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dates</span>
              <span className="text-xs font-semibold text-slate-800 truncate">
                {startDate && endDate
                  ? `${startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                  : startDate
                  ? startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                  : "Any dates"}
              </span>
            </button>

            <div className="w-px h-6 bg-slate-200 mx-2.5 hidden sm:block" />

            <button
              type="button"
              className="hidden sm:flex flex-col flex-1 text-left cursor-pointer px-1"
              onClick={() => toggleTab("vehicle")}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</span>
              <span className="text-xs font-semibold text-slate-800 truncate">{vehicle}</span>
            </button>

            <button
              type="button"
              className="flex items-center justify-center w-9 h-9 sm:w-auto sm:px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer ml-1.5 shrink-0 transition-colors"
              onClick={handleSearch}
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span className="hidden sm:inline ml-1.5">Search</span>
            </button>
          </div>

          {/* Where Dropdown */}
          {searchExpanded && activeTab === "where" && (
            <div className="absolute top-full mt-3 left-0 w-72 bg-white rounded-2xl shadow-xl p-4 z-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</span>
                {location !== "All Locations" && (
                  <button
                    type="button"
                    onClick={() => handleSelectLocation("All Locations")}
                    className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {CITIES.map((city) => (
                  <button
                    key={city}
                    type="button"
                    className={`flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      location === city
                        ? "bg-blue-50 text-blue-700"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                    onClick={() => handleSelectLocation(city)}
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span>{city}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dates Dropdown */}
          {searchExpanded && activeTab === "dates" && (
            <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl p-5 sm:p-6 z-50 w-[94vw] max-w-[740px] border border-slate-200">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {startDate && endDate
                      ? `${getRentalDaysCount()}-day trip`
                      : startDate
                      ? "Select return date"
                      : "Select rental dates"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {startDate && endDate
                      ? `${startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                      : startDate
                      ? `Pick-up: ${startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                      : "Pick-up and return"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={handleClearDates}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setSearchExpanded(false); setActiveTab(null); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 px-2">
                <button
                  type="button"
                  className="text-slate-600 hover:bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer"
                  onClick={prevMonth}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-1 justify-around text-sm font-bold text-slate-900">
                  <span>{MONTH_NAMES[month1.month]} {month1.year}</span>
                  <span className="hidden sm:inline">{MONTH_NAMES[month2.month]} {month2.year}</span>
                </div>
                <button
                  type="button"
                  className="text-slate-600 hover:bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full cursor-pointer"
                  onClick={nextMonth}
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 px-2">
                <CalendarMonth
                  days={month1.days}
                  year={month1.year}
                  month={month1.month}
                  startDate={startDate}
                  endDate={endDate}
                  today={today}
                  onDayClick={handleDayClick}
                />
                <div className="hidden sm:block">
                  <CalendarMonth
                    days={month2.days}
                    year={month2.year}
                    month={month2.month}
                    startDate={startDate}
                    endDate={endDate}
                    today={today}
                    onDayClick={handleDayClick}
                  />
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleApplyDatesAndClose}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  {startDate && endDate ? "Apply" : "Done"}
                </button>
              </div>
            </div>
          )}

          {/* Vehicle Type Dropdown */}
          {searchExpanded && activeTab === "vehicle" && (
            <div className="absolute top-full mt-3 right-0 w-72 bg-white rounded-2xl shadow-xl p-4 z-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle Type</span>
                {vehicle !== "All Types" && (
                  <button
                    type="button"
                    onClick={() => handleSelectVehicle("All Types")}
                    className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {availableVehicles.map((type) => {
                  const meta = VEHICLE_META[type] || { label: type };
                  const isSelected = vehicle === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      className={`text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "hover:bg-slate-50 text-slate-700 border border-slate-100"
                      }`}
                      onClick={() => handleSelectVehicle(type)}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Actions: Basket & Account */}
        <div className="flex items-center gap-2.5 relative shrink-0">
          <button
            type="button"
            onClick={openDrawer}
            className={`relative flex items-center gap-1.5 h-9 px-3 rounded-full transition-colors cursor-pointer border text-xs font-semibold ${
              remainingHoldSeconds > 0
                ? remainingHoldSeconds <= 120
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800"
            }`}
            aria-label="Rental Basket"
          >
            <ShoppingBag className="w-4 h-4" />
            {itemCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold leading-none">
                {itemCount}
              </span>
            )}
            {remainingHoldSeconds > 0 && (
              <span className="font-mono text-[11px] font-bold">
                {Math.floor(remainingHoldSeconds / 60)}:{String(remainingHoldSeconds % 60).padStart(2, "0")}
              </span>
            )}
          </button>

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-9 h-9 rounded-full bg-slate-900 hover:bg-blue-600 text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                aria-label="Account menu"
              >
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </button>

              {dropdownOpen && (
                <div className="absolute top-[115%] right-0 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-900 truncate">{user.name || "Account"}</div>
                    {user.email && (
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      openDrawer();
                    }}
                    className="flex items-center justify-between w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                      <span>Basket</span>
                    </span>
                    {itemCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                        {itemCount}
                      </span>
                    )}
                  </button>
                  <Link
                    href="/saved"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 no-underline"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Heart className="w-3.5 h-3.5 text-slate-400" />
                    <span>Saved Cars</span>
                  </Link>
                  <Link
                    href="/booking/my"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 no-underline"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>My Trips</span>
                  </Link>
                  <Link
                    href="/auth/kid/profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 no-underline"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Profile</span>
                  </Link>
                  {["ADMIN", "HOST"].includes(String(user?.role || "").toUpperCase()) && (
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 no-underline"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Dashboard</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer border-t border-slate-100 mt-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              id="nav-kid-signin-btn"
              type="button"
              onClick={handleKidSignIn}
              disabled={signingIn}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors disabled:opacity-60 cursor-pointer"
              aria-label="Sign in"
            >
              {signingIn ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <LogIn className="w-3.5 h-3.5 text-slate-600" />
              )}
              <span className="hidden sm:inline">{signingIn ? "Connecting…" : "Log in"}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

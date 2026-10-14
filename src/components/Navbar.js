"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Loader2, ShieldCheck, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCars } from "@/lib/api";
import { redirectToKID, session } from "@/lib/kid-auth";
import { useBasket } from "@/context/BasketContext";
import { ShoppingCartMinus } from "lucide-react";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const CITIES = ["All Locations", "Phnom Penh", "Siem Reap", "Sihanoukville", "Battambang"];
const VEHICLE_TYPES = ["All Types", "Sedan", "SUV", "Luxury", "Electric", "Van", "Truck"];

const VEHICLE_META = {
  "All Types": { icon: "✨", label: "All Cars" },
  "Sedan": { icon: "🚗", label: "Sedans" },
  "SUV": { icon: "🚙", label: "SUV & 4x4" },
  "Luxury": { icon: "👑", label: "Luxury" },
  "Electric": { icon: "⚡", label: "Electric" },
  "Van": { icon: "🚐", label: "Van" },
  "Truck": { icon: "🛻", label: "Pickup" },
};

export default function Navbar({ onSearchSubmit, initialSearch = {} }) {
  const router = useRouter();
  const { itemCount, openDrawer, remainingHoldSeconds } = useBasket();
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const [searchExpanded, setSearchExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(null); // 'where', 'dates', 'vehicle'

  const [location, setLocation] = useState(initialSearch.location || "All Locations");
  const [startDate, setStartDate] = useState(initialSearch.startDate || null);
  const [endDate, setEndDate] = useState(initialSearch.endDate || null);
  const [vehicle, setVehicle] = useState(initialSearch.vehicle || "All Types");
  const [availableVehicles, setAvailableVehicles] = useState(VEHICLE_TYPES);

  // Sync internal state with initialSearch prop changes
  useEffect(() => {
    if (initialSearch.location !== undefined) setLocation(initialSearch.location);
    if (initialSearch.startDate !== undefined) setStartDate(initialSearch.startDate);
    if (initialSearch.endDate !== undefined) setEndDate(initialSearch.endDate);
    if (initialSearch.vehicle !== undefined) setVehicle(initialSearch.vehicle);
  }, [initialSearch.location, initialSearch.startDate, initialSearch.endDate, initialSearch.vehicle]);

  const navRef = useRef(null);

  // Calendar State
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  useEffect(() => {
    if (typeof window !== "undefined") {
      const kidUser = session.getUser();
      if (kidUser) {
        setUser(kidUser);
      } else {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try { setUser(JSON.parse(storedUser)); } catch (e) { }
        }
      }
    }
  }, []);

  // Click outside to close expanded search & user dropdown
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

  // Update available vehicles when dates change
  useEffect(() => {
    if (startDate && endDate) {
      getCars({ start: startDate.toISOString(), end: endDate.toISOString() })
        .then(res => {
          if (res.success && res.cars) {
            const types = new Set(res.cars.map(c => c.category || "Sedan"));
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

  // Reset sign-in loading state if user navigates back (bfcache) or switches back to tab
  useEffect(() => {
    const handleResetLoading = () => {
      setSigningIn(false);
    };

    window.addEventListener("pageshow", handleResetLoading);
    window.addEventListener("focus", handleResetLoading);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setSigningIn(false);
      }
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
    // Safety fallback: reset loading if browser navigation doesn't occur within 6 seconds
    const safetyTimer = setTimeout(() => {
      setSigningIn(false);
    }, 6000);

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
        }).catch(() => { });
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

  const handleSelectVehicle = (selectedType) => {
    setVehicle(selectedType);
    handleSearch(null, { vehicle: selectedType });
  };

  // Calendar Logic
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
    if (onSearchSubmit) {
      onSearchSubmit({ location, startDate, endDate, vehicle });
    }
  };

  const handleClearDates = () => {
    setStartDate(null);
    setEndDate(null);
    if (onSearchSubmit) {
      onSearchSubmit({ location, startDate: null, endDate: null, vehicle });
    }
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

        // Turn to vehicle tab and update search after completing date selection
        setTimeout(() => {
          setActiveTab('vehicle');
          if (onSearchSubmit) {
            onSearchSubmit({
              location,
              startDate: selectedStart,
              endDate: selectedEnd,
              vehicle,
            });
          }
        }, 300);
      }
    }
  };

  const prevMonth = (e) => { e.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)); };
  const nextMonth = (e) => { e.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)); };

  const month1 = buildDaysForMonth(0);
  const month2 = buildDaysForMonth(1);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 transition-all duration-300">
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 h-20 flex items-center justify-between gap-4" ref={navRef}>
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-1 text-xl font-extrabold text-brand-primary tracking-tight no-underline">
          <img src="/blue-logo.png" alt="Logo" width={64} height={64} />
          <span>DriveKH</span>
        </Link>

        {/* Search Pill */}
        <div className="flex-1 flex justify-center relative w-full max-w-2xl">
          <div className="flex items-center bg-white border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-all duration-200 w-full pl-8 pr-2 py-2">
            <div
              className={`flex flex-col flex-1 cursor-pointer transition-all ${activeTab === 'where' ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => { setSearchExpanded(true); setActiveTab('where'); }}
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-900">Where?</span>
              <span className="text-sm font-medium text-gray-500 truncate">{location}</span>
            </div>

            <div className="w-px h-8 bg-gray-200 mx-4"></div>

            <div
              className={`flex flex-col flex-1 cursor-pointer transition-all ${activeTab === 'dates' ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => { setSearchExpanded(true); setActiveTab('dates'); }}
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-900">When?</span>
              <span className="text-sm font-medium text-gray-500 truncate">
                {startDate && endDate ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}` : startDate ? startDate.toLocaleDateString() : "Any day"}
              </span>
            </div>

            <div className="w-px h-8 bg-gray-200 mx-4"></div>

            <div
              className={`flex flex-col flex-[1.2] cursor-pointer transition-all ${activeTab === 'vehicle' ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => { setSearchExpanded(true); setActiveTab('vehicle'); }}
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-900">Car Type</span>
              <span className="text-sm font-medium text-gray-500 truncate">{vehicle}</span>
            </div>

            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs cursor-pointer ml-2 flex-shrink-0"
              onClick={handleSearch}
              aria-label="Search"
            >
              <Search className="w-4 h-4 text-white" strokeWidth={2.5} />
              <span>Search</span>
            </button>
          </div>

          {/* Dropdown Panels */}
          {searchExpanded && activeTab === 'where' && (
            <div className="absolute top-full mt-4 left-0 w-[400px] bg-white rounded-[32px] shadow-2xl p-6 z-50 border border-gray-100">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Pick a city</h3>
              <div className="flex flex-col gap-2">
                {CITIES.map(city => (
                  <button
                    key={city}
                    className={`text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${location === city ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' : 'hover:bg-gray-100 text-gray-700'}`}
                    onClick={() => { setLocation(city); setActiveTab('dates'); }}
                  >
                    📍 {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchExpanded && activeTab === 'dates' && (
            <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 bg-white rounded-[32px] shadow-2xl p-6 sm:p-8 z-50 w-[95vw] max-w-[850px] border border-gray-100">

              {/* Header: Status, selection summary, and close */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {startDate && endDate
                      ? `${getRentalDaysCount()}-day trip`
                      : startDate
                        ? 'Now pick return date'
                        : 'Pick your dates'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {startDate && endDate
                      ? `${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : startDate
                        ? `Picked up ${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · Now pick return`
                        : 'Choose pickup & return date'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={handleClearDates}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setSearchExpanded(false); setActiveTab(null); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors text-base font-bold"
                    aria-label="Close date picker"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Months Navigation */}
              <div className="flex items-center justify-between mb-6 px-4">
                <button className="text-gray-500 hover:bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full font-bold cursor-pointer" onClick={prevMonth}>‹</button>
                <div className="flex flex-1 justify-around">
                  <span className="font-bold text-gray-900 text-lg">{MONTH_NAMES[month1.month]} {month1.year}</span>
                  <span className="font-bold text-gray-900 text-lg">{MONTH_NAMES[month2.month]} {month2.year}</span>
                </div>
                <button className="text-gray-500 hover:bg-gray-100 w-8 h-8 flex items-center justify-center rounded-full font-bold cursor-pointer" onClick={nextMonth}>›</button>
              </div>

              <div className="flex gap-12 justify-center px-4">
                {/* Month 1 */}
                <div className="flex-1">
                  <div className="grid grid-cols-7 gap-y-4 gap-x-1 text-center mb-4">
                    {DAY_LABELS.map(l => <div key={l} className="text-xs font-semibold text-gray-400">{l.charAt(0)}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center">
                    {month1.days.map((day, i) => {
                      if (!day) return <div key={i} className="aspect-square" />;
                      const isPast = day < today;
                      const isStart = startDate && day.getTime() === startDate.getTime();
                      const isEnd = endDate && day.getTime() === endDate.getTime();
                      const inRange = startDate && endDate && day > startDate && day < endDate;
                      return (
                        <div
                          key={day.toISOString()}
                          className={`aspect-square flex items-center justify-center rounded-full text-sm font-semibold cursor-pointer transition-all mx-auto w-10 h-10
                            ${isPast ? 'text-gray-300 line-through cursor-not-allowed' : 'hover:border hover:border-black text-gray-800'}
                            ${isStart || isEnd ? 'bg-gray-900 text-white hover:bg-gray-900 hover:border-transparent' : ''}
                            ${inRange ? 'bg-gray-100 text-gray-900 rounded-none w-full hover:border-transparent' : ''}
                          `}
                          onClick={() => handleDayClick(day)}
                        >
                          {day.getDate()}
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* Month 2 */}
                <div className="flex-1">
                  <div className="grid grid-cols-7 gap-y-4 gap-x-1 text-center mb-4">
                    {DAY_LABELS.map(l => <div key={l} className="text-xs font-semibold text-gray-400">{l.charAt(0)}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center">
                    {month2.days.map((day, i) => {
                      if (!day) return <div key={i} className="aspect-square" />;
                      const isPast = day < today;
                      const isStart = startDate && day.getTime() === startDate.getTime();
                      const isEnd = endDate && day.getTime() === endDate.getTime();
                      const inRange = startDate && endDate && day > startDate && day < endDate;
                      return (
                        <div
                          key={day.toISOString()}
                          className={`aspect-square flex items-center justify-center rounded-full text-sm font-semibold cursor-pointer transition-all mx-auto w-10 h-10
                            ${isPast ? 'text-gray-300 line-through cursor-not-allowed' : 'hover:border hover:border-black text-gray-800'}
                            ${isStart || isEnd ? 'bg-gray-900 text-white hover:bg-gray-900 hover:border-transparent' : ''}
                            ${inRange ? 'bg-gray-100 text-gray-900 rounded-none w-full hover:border-transparent' : ''}
                          `}
                          onClick={() => handleDayClick(day)}
                        >
                          {day.getDate()}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Footer Action Bar: Status summary, Done/Close and Choose Vehicle buttons */}
              <div className="mt-8 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-gray-600 font-medium">
                  {startDate && endDate ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      {getRentalDaysCount()} days ✓ — Now choose your car
                    </span>
                  ) : startDate ? (
                    <span className="text-amber-700 font-semibold">
                      📍 {startDate.toLocaleDateString()} picked — now pick return date
                    </span>
                  ) : (
                    <span>Pick a start date</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleApplyDatesAndClose}
                    className="px-4 py-2 rounded-full border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-xs font-bold text-gray-800 cursor-pointer transition-colors shadow-xs"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('vehicle');
                      if (startDate && endDate && onSearchSubmit) {
                        onSearchSubmit({ location, startDate, endDate, vehicle });
                      }
                    }}
                    className="px-5 py-2 rounded-full bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <span>Choose Car</span>
                    <span>→</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {searchExpanded && activeTab === 'vehicle' && (
            <div className="absolute top-full mt-4 right-0 w-[420px] bg-white rounded-[32px] shadow-2xl p-6 z-50 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Pick a car type</h3>
                {vehicle !== "All Types" && (
                  <button
                    type="button"
                    onClick={() => handleSelectVehicle("All Types")}
                    className="text-xs font-bold text-brand-primary hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              {startDate && endDate ? (
                <p className="text-[10px] text-brand-primary mb-3 font-semibold bg-brand-primary/10 p-2 rounded-lg">Cars ready for your dates.</p>
              ) : (
                <p className="text-[10px] text-gray-500 mb-3 bg-gray-50 p-2 rounded-lg">Browse all car types.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
                {availableVehicles.map(type => {
                  const meta = VEHICLE_META[type] || { icon: "🚘", label: type };
                  const isSelected = vehicle === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      className={`flex items-center gap-2.5 text-left px-3.5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${isSelected
                        ? 'bg-brand-primary text-white shadow-sm ring-2 ring-brand-primary/20'
                        : 'hover:bg-gray-100 text-gray-800 border border-gray-100'
                        }`}
                      onClick={() => handleSelectVehicle(type)}
                    >
                      <span className="text-lg">{meta.icon}</span>
                      <span className="truncate">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Navigation */}
        <div className="flex items-center gap-4 relative">
          {/* Basket Checkout Trigger with Item Count & 15m Hold Countdown */}
          <button
            type="button"
            onClick={openDrawer}
            className={`relative flex items-center gap-1.5 h-9 rounded-full transition-all cursor-pointer select-none shadow-xs border ${
              remainingHoldSeconds > 0
                ? remainingHoldSeconds <= 120
                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 px-2.5"
                  : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 px-2.5"
                : "bg-white border-gray-200 hover:bg-gray-50 text-gray-800 px-2.5"
            }`}
            title={
              remainingHoldSeconds > 0
                ? `Active Hold: ${Math.floor(remainingHoldSeconds / 60)}:${String(remainingHoldSeconds % 60).padStart(2, "0")} remaining`
                : "Open Rental Basket"
            }
            aria-label="Rental Basket"
          >
            <div className="relative flex items-center justify-center">
              <ShoppingCartMinus className="w-4 h-4" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-brand-primary text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {itemCount}
                </span>
              )}
            </div>

            {remainingHoldSeconds > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                <span>
                  {Math.floor(remainingHoldSeconds / 60)}:{String(remainingHoldSeconds % 60).padStart(2, "0")}
                </span>
              </span>
            )}
          </button>

          {/* <Link
            href="/auth/register"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-300 text-gray-900 hover:bg-gray-50 transition-all no-underline"
          >
            Become a Host
          </Link> */}

          {user ? (
            <div className="relative">
              <div
                className="flex items-center  bg-white border-gray-300 rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer select-none"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {/* <div className="flex flex-col text-right pl-1">
                  <span className="text-xs font-bold text-gray-900 max-w-[110px] truncate leading-tight">
                    {user.first}{user.name || "KID User"}
                  </span>
                  {user.kid && (
                    <span className="text-[10px] text-brand-primary font-mono font-bold leading-tight">
                      KID-{user.kid}
                    </span>
                  )}
                </div> */}
                <div className="w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : "👤"}
                </div>
              </div>

              {/* User Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute top-[115%] right-0 w-60 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100 text-xs">
                    <div className="font-bold text-gray-900">{user.name || "KID User"}</div>
                    {user.kid && (
                      <div className="text-brand-primary font-mono text-[11px] font-semibold mt-0.5">
                        KID Number: {user.kid}
                      </div>
                    )}
                    {user.email && (
                      <div className="text-gray-500 text-[11px] truncate mt-0.5">{user.email}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      openDrawer();
                    }}
                    className="flex items-center justify-between w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <span>🛒</span>
                      <span>My Basket</span>
                    </span>
                    {itemCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-brand-primary text-white text-[10px] font-bold">
                        {itemCount}
                      </span>
                    )}
                  </button>
                  <Link
                    href="/saved"
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 no-underline"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span>❤️</span>
                    <span>Saved Cars</span>
                  </Link>
                  <Link
                    href="/auth/kid/profile"
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 no-underline"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span>🛡️</span>
                    <span>My Profile</span>
                  </Link>
                  <Link
                    href="/booking/my"
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 no-underline"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span>🔖</span>
                    <span>My Bookings</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 cursor-pointer border-t border-gray-100"
                  >
                    <span>🚪</span>
                    <span>Log Out</span>
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
              className="group relative inline-flex items-center justify-center gap-2 h-9 w-9 sm:w-auto sm:px-3.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-800 hover:text-black text-xs font-semibold shadow-xs hover:shadow transition-all duration-150 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer select-none"
              title="Sign in with KOOMPI ID (KID)"
              aria-label="Sign in"
            >
              {signingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-brand-primary shrink-0" />
                  <span className="hidden sm:inline text-xs font-medium text-gray-600">Connecting…</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-gray-600 group-hover:text-black transition-colors shrink-0" />
                  <span className="hidden sm:inline">Log in</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

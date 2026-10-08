"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCars } from "@/lib/api";
import { redirectToKID, session } from "@/lib/kid-auth";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const CITIES = ["All Locations", "Phnom Penh", "Siem Reap", "Sihanoukville", "Battambang"];
const VEHICLE_TYPES = ["All Types", "Sedan", "SUV", "Luxury", "Van", "Truck"];

export default function Navbar({ onSearchSubmit, initialSearch = {} }) {
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

  const handleKidSignIn = async () => {
    setSigningIn(true);
    try {
      await redirectToKID();
    } catch (err) {
      console.error("KID sign in error:", err);
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

  const handleSearch = (e) => {
    if (e) e.stopPropagation();
    setSearchExpanded(false);
    setActiveTab(null);
    if (onSearchSubmit) {
      onSearchSubmit({ location, startDate, endDate, vehicle });
    }
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

  const handleDayClick = (day) => {
    if (!day || day < today) return;
    if (!startDate || (startDate && endDate)) {
      setStartDate(day); setEndDate(null);
    } else {
      if (day <= startDate) { setStartDate(day); setEndDate(null); }
      else setEndDate(day);
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
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-brand-primary tracking-tight no-underline">
          <span className="text-2xl">🚗</span>
          <span>DriveKH</span>
        </Link>

        {/* Search Pill */}
        <div className="flex-1 flex justify-center relative w-full max-w-2xl">
          <div className="flex items-center bg-white border border-gray-300 rounded-full shadow-sm hover:shadow-md transition-all duration-200 w-full pl-8 pr-2 py-2">
            <div
              className={`flex flex-col flex-1 cursor-pointer transition-all ${activeTab === 'where' ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => { setSearchExpanded(true); setActiveTab('where'); }}
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-900">Where</span>
              <span className="text-sm font-medium text-gray-500 truncate">{location}</span>
            </div>

            <div className="w-px h-8 bg-gray-200 mx-4"></div>

            <div
              className={`flex flex-col flex-1 cursor-pointer transition-all ${activeTab === 'dates' ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => { setSearchExpanded(true); setActiveTab('dates'); }}
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-900">Dates</span>
              <span className="text-sm font-medium text-gray-500 truncate">
                {startDate && endDate ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}` : startDate ? startDate.toLocaleDateString() : "Anytime"}
              </span>
            </div>

            <div className="w-px h-8 bg-gray-200 mx-4"></div>

            <div
              className={`flex flex-col flex-[1.2] cursor-pointer transition-all ${activeTab === 'vehicle' ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              onClick={() => { setSearchExpanded(true); setActiveTab('vehicle'); }}
            >
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-900">Vehicle</span>
              <span className="text-sm font-medium text-gray-500 truncate">{vehicle}</span>
            </div>

            <button
              className="w-10 h-10 rounded-full bg-brand-primary hover:bg-brand-hover text-white flex items-center justify-center text-sm font-bold flex-shrink-0 transition-transform hover:scale-105 ml-2 shadow-sm"
              onClick={handleSearch}
              aria-label="Search"
            >
              🔍
            </button>
          </div>

        {/* Dropdown Panels */}
        {searchExpanded && activeTab === 'where' && (
          <div className="absolute top-full mt-4 left-0 w-[400px] bg-white rounded-[32px] shadow-2xl p-6 z-50 border border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Select Location</h3>
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
          <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 bg-white rounded-[32px] shadow-2xl p-8 z-50 w-[850px] border border-gray-100">

            {/* Dates / Flexible Tabs Mockup */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-100 rounded-full flex p-1">
                <div className="px-6 py-2 bg-white rounded-full shadow-sm text-sm font-semibold text-gray-900">Dates</div>
                <div className="px-6 py-2 rounded-full text-sm font-semibold text-gray-600 hover:text-gray-900 cursor-pointer">Flexible</div>
              </div>
            </div>

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

            {/* Exact dates buttons (Mockup for style) */}
            <div className="mt-8 flex gap-3 px-4">
              <button className="px-4 py-1.5 rounded-full border border-gray-900 text-sm font-semibold text-gray-900 bg-gray-50">Exact dates</button>
              <button className="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-700 hover:border-gray-900">± 1 day</button>
              <button className="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-700 hover:border-gray-900">± 2 days</button>
              <button className="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-700 hover:border-gray-900">± 3 days</button>
              <button className="px-4 py-1.5 rounded-full border border-gray-300 text-sm text-gray-700 hover:border-gray-900">± 7 days</button>
            </div>

          </div>
        )}

        {searchExpanded && activeTab === 'vehicle' && (
          <div className="absolute top-full mt-4 right-0 w-[400px] bg-white rounded-[32px] shadow-2xl p-6 z-50 border border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4">Select Vehicle Type</h3>
            {startDate && endDate ? (
              <p className="text-[10px] text-brand-primary mb-3 font-semibold bg-brand-primary/10 p-2 rounded-lg">Showing vehicles available for your dates.</p>
            ) : (
              <p className="text-[10px] text-gray-500 mb-3 bg-gray-50 p-2 rounded-lg">Select dates first to see accurate availability.</p>
            )}
            <div className="flex flex-col gap-2">
              {availableVehicles.map(type => (
                <button
                  key={type}
                  className={`text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${vehicle === type ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' : 'hover:bg-gray-100 text-gray-700'}`}
                  onClick={() => { setVehicle(type); handleSearch(); }}
                >
                  🚘 {type}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Profile Navigation */}
      <div className="flex items-center gap-4 relative">
        <Link
          href="/auth/register"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-300 text-gray-900 hover:bg-gray-50 transition-all no-underline"
        >
          Become a Host
        </Link>

        {user ? (
          <div className="relative">
            <div
              className="flex items-center gap-2.5 bg-white border border-gray-300 rounded-full py-1.5 pl-3 pr-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer select-none"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="flex flex-col text-right pl-1">
                <span className="text-xs font-bold text-gray-900 max-w-[110px] truncate leading-tight">
                  {user.name || "KID User"}
                </span>
                {user.kid && (
                  <span className="text-[10px] text-brand-primary font-mono font-bold leading-tight">
                    KID-{user.kid}
                  </span>
                )}
              </div>
              <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold shadow-sm">
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
                <Link
                  href="/auth/kid/profile"
                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 no-underline"
                  onClick={() => setDropdownOpen(false)}
                >
                  <span>🛡️</span>
                  <span>KID Profile &amp; Wallet</span>
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
            className="group relative inline-flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm bg-gradient-to-r from-[#FF385C] via-[#FA2B56] to-[#E00B41] text-white shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-75 border border-white/25"
            title="Sign in with KOOMPI ID (KID)"
          >
            {/* KID Shield Icon Badge */}
            <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center flex-shrink-0">
              {signingIn ? (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="animate-spin text-white"
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white group-hover:scale-110 transition-transform"
                >
                  <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2z" fill="white" fillOpacity="0.2" stroke="white" />
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="3" />
                </svg>
              )}
            </div>

            <span className="tracking-tight whitespace-nowrap">
              {signingIn ? "Connecting…" : "Sign in with KID"}
            </span>

            {/* Small badge */}
            <span className="hidden sm:inline-flex items-center text-[9px] font-black uppercase tracking-wider bg-black/20 text-white/90 px-1.5 py-0.5 rounded-full border border-white/20">
              SSO
            </span>
          </button>
        )}
      </div>
      </div>
    </header>
  );
}

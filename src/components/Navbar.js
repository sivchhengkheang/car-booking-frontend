"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar({ onSearchChange, selectedLocation }) {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {}
      }
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    setUser(null);
    setDropdownOpen(false);
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-[#FF385C] tracking-tight no-underline">
          <span className="text-2xl">🚗</span>
          <span>DriveKH</span>
        </Link>

        {/* Airbnb Floating Search Pill */}
        <div
          className="flex items-center bg-white border border-gray-300 rounded-full py-1.5 pl-5 pr-1.5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer max-w-md w-full"
          onClick={() => onSearchChange && onSearchChange()}
        >
          <div className="flex flex-col flex-1 px-2 border-r border-gray-200">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-900">Where</span>
            <span className="text-xs font-medium text-gray-500 truncate">
              {selectedLocation || "Any Location"}
            </span>
          </div>
          <div className="flex flex-col flex-1 px-2 border-r border-gray-200">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-900">Dates</span>
            <span className="text-xs font-medium text-gray-500 truncate">Anytime</span>
          </div>
          <div className="flex flex-col flex-1 px-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-900">Vehicle</span>
            <span className="text-xs font-medium text-gray-500 truncate">All Types</span>
          </div>
          <button className="w-9 h-9 rounded-full bg-[#FF385C] hover:bg-[#E00B41] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 transition-transform hover:scale-105" aria-label="Search">
            🔍
          </button>
        </div>

        {/* User Profile Navigation */}
        <div className="flex items-center gap-4 relative">
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-300 text-gray-900 hover:bg-gray-50 transition-all no-underline"
          >
            Become a Host
          </Link>

          <div
            className="flex items-center gap-3 bg-white border border-gray-300 rounded-full py-1.5 pl-3.5 pr-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span className="text-sm">☰</span>
            <div className="w-8 h-8 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs font-bold">
              {user?.name ? user.name.charAt(0).toUpperCase() : "👤"}
            </div>
          </div>

          {/* User Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute top-[115%] right-0 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl py-2 z-50">
              {user ? (
                <>
                  <div className="px-4 py-3 border-b border-gray-100 text-xs">
                    <div className="font-bold text-gray-900">{user.name}</div>
                    <div className="text-gray-500 text-[11px] truncate">{user.email}</div>
                  </div>
                  <Link
                    href="/booking/my"
                    className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 no-underline"
                    onClick={() => setDropdownOpen(false)}
                  >
                    🔖 My Bookings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-50 cursor-pointer"
                  >
                    🚪 Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="block px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 no-underline"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="block px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 no-underline"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

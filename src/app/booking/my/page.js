"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getMyBookings, cancelBooking } from "@/lib/api";
import { session, redirectToKID } from "@/lib/kid-auth";

const STATUS_FILTERS = [
  { id: "ALL", label: "All Reservations" },
  { id: "UPCOMING", label: "Upcoming & Active" },
  { id: "PENDING_PAYMENT", label: "Pending Payment" },
  { id: "COMPLETED", label: "Completed" },
  { id: "CANCELLED", label: "Cancelled" },
];

const DEFAULT_CAR_PHOTO =
  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80";

function getStatusBadge(status) {
  switch (status) {
    case "PAID":
    case "CONFIRMED":
      return {
        label: "Confirmed",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "ACTIVE":
      return {
        label: "Active Trip",
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        dot: "bg-blue-500",
      };
    case "PENDING_PAYMENT":
      return {
        label: "Awaiting Payment",
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        bg: "bg-purple-50 text-purple-700 border-purple-200",
        dot: "bg-purple-500",
      };
    case "CANCELLED":
    case "EXPIRED":
      return {
        label: status === "EXPIRED" ? "Hold Expired" : "Cancelled",
        bg: "bg-red-50 text-red-600 border-red-200",
        dot: "bg-red-500",
      };
    default:
      return {
        label: status || "Pending",
        bg: "bg-gray-50 text-gray-700 border-gray-200",
        dot: "bg-gray-400",
      };
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MyBookingsContent() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("ALL");
  const [cancellingId, setCancellingId] = useState(null);

  const fetchBookings = useCallback(async (authToken = token) => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMyBookings(authToken);
      if (data.success && Array.isArray(data.bookings)) {
        setBookings(data.bookings);
      } else {
        setError(data.message || "Failed to load your reservations");
      }
    } catch {
      setError("Unable to connect to the booking server. Please check your network.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initialize Auth & Fetch Bookings
  useEffect(() => {
    if (typeof window === "undefined") return;
    const activeToken = session.getAccessToken() || localStorage.getItem("token");
    const activeUser = session.getUser();
    setToken(activeToken);
    setUser(activeUser);

    if (activeToken) {
      fetchBookings(activeToken);
    } else {
      setLoading(false);
    }
  }, [fetchBookings]);

  // Handle cancellation
  const handleCancel = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;
    setCancellingId(bookingId);
    try {
      const res = await cancelBooking(bookingId, "Cancelled by customer", token);
      if (res.success) {
        await fetchBookings();
      } else {
        alert(res.message || "Failed to cancel booking.");
      }
    } catch {
      alert("Error cancelling reservation.");
    } finally {
      setCancellingId(null);
    }
  };

  // Filter bookings based on activeTab
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "UPCOMING") {
      return ["CONFIRMED", "PAID", "ACTIVE"].includes(b.status);
    }
    if (activeTab === "PENDING_PAYMENT") {
      return b.status === "PENDING_PAYMENT";
    }
    if (activeTab === "COMPLETED") {
      return b.status === "COMPLETED";
    }
    if (activeTab === "CANCELLED") {
      return ["CANCELLED", "EXPIRED"].includes(b.status);
    }
    return true;
  });

  // ── Render: Not Signed In ──────────────────────────────────────────
  if (!loading && !token) {
    return (
      <>
        <Navbar />
        <main className="min-h-[calc(100vh-80px)] flex items-center justify-center py-16 px-4 bg-gray-50/50">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-200 shadow-xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-light text-brand-primary flex items-center justify-center text-3xl mx-auto mb-4">
              🔖
            </div>
            <h1 className="text-xl font-extrabold text-gray-900 mb-2">
              View Your Bookings
            </h1>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Sign in with your KOOMPI ID (KID) or account to access your upcoming trips,
              rental history, and Baray payment receipts.
            </p>

            <button
              id="my-bookings-signin-btn"
              type="button"
              onClick={redirectToKID}
              className="w-full relative overflow-hidden group flex items-center justify-between py-3.5 px-5 rounded-2xl font-bold text-sm bg-gradient-to-r from-red-600 via-rose-600 to-[#FF385C] text-white shadow-md shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/35 hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer border border-white/20 mb-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  🛡️
                </div>
                <div className="text-left">
                  <div className="text-sm font-extrabold text-white">Sign in with KID</div>
                  <div className="text-[10px] text-white/80">One-click digital identity</div>
                </div>
              </div>
              <div className="text-white text-xs">→</div>
            </button>

            <Link
              href="/auth/login"
              className="inline-block text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors mt-2"
            >
              Or sign in with email &amp; password
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                My Reservations
              </h1>
              {user?.kid && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand-light text-brand-primary border border-brand-primary/20">
                  KID-{user.kid}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Manage your rental agreements, payment statuses, and vehicle pick-ups
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-all"
          >
            <span>🔍</span>
            <span>Browse More Cars</span>
          </Link>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 mb-6 border-b border-gray-200">
          {STATUS_FILTERS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count =
              tab.id === "ALL"
                ? bookings.length
                : tab.id === "UPCOMING"
                ? bookings.filter((b) => ["CONFIRMED", "PAID", "ACTIVE"].includes(b.status)).length
                : tab.id === "PENDING_PAYMENT"
                ? bookings.filter((b) => b.status === "PENDING_PAYMENT").length
                : tab.id === "COMPLETED"
                ? bookings.filter((b) => b.status === "COMPLETED").length
                : bookings.filter((b) => ["CANCELLED", "EXPIRED"].includes(b.status)).length;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl mb-6 flex items-center justify-between text-xs text-red-700">
            <span>⚠️ {error}</span>
            <button
              onClick={fetchBookings}
              className="font-bold underline hover:text-red-900 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm animate-pulse flex flex-col gap-4"
              >
                <div className="w-full aspect-[16/10] bg-gray-200 rounded-2xl" />
                <div className="h-4 bg-gray-200 rounded-full w-3/4" />
                <div className="h-3 bg-gray-200 rounded-full w-1/2" />
                <div className="h-10 bg-gray-200 rounded-xl mt-auto" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredBookings.length === 0 && (
          <div className="p-16 text-center bg-white rounded-3xl border border-gray-200 shadow-sm max-w-xl mx-auto my-8">
            <div className="text-5xl mb-4">🚗</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              No reservations found
            </h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              {activeTab === "ALL"
                ? "You haven't made any car reservations yet. Explore vehicles across Phnom Penh, Siem Reap, and Sihanoukville."
                : `You don't have any reservations under "${STATUS_FILTERS.find((f) => f.id === activeTab)?.label}".`}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs bg-brand-primary hover:bg-brand-hover text-white shadow-md hover:shadow-lg transition-all"
            >
              Explore Vehicles &amp; Book
            </Link>
          </div>
        )}

        {/* Bookings Grid */}
        {!loading && filteredBookings.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBookings.map((b) => {
              const car = b.car;
              const photo =
                car?.photos && car.photos.length > 0 ? car.photos[0] : DEFAULT_CAR_PHOTO;
              const badge = getStatusBadge(b.status);
              const isPending = b.status === "PENDING_PAYMENT";
              const isCanCancel = ["PENDING_PAYMENT", "PAID", "CONFIRMED"].includes(b.status);

              return (
                <div
                  key={b._id}
                  className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
                >
                  {/* Vehicle Image & Badge */}
                  <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt={car?.modelName || "Car"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Status Pill */}
                    <div
                      className={`absolute top-3 left-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border shadow-sm backdrop-blur-sm ${badge.bg}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                      <span>{badge.label}</span>
                    </div>

                    {/* Total Price Tag */}
                    <div className="absolute bottom-3 right-3 z-10 bg-gray-900/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur-sm shadow-md">
                      ${b.totalPrice?.toFixed(2)}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="mb-3">
                      <h3 className="text-base font-extrabold text-gray-900 leading-snug">
                        {car?.brand || "Car"} {car?.modelName || ""} ({car?.year || 2024})
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <span>📍</span>
                        <span>
                          {car?.location?.city || car?.location?.address || "Phnom Penh, Cambodia"}
                        </span>
                      </p>
                    </div>

                    {/* Trip Schedule Box */}
                    <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-3.5 flex items-center justify-between mb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                          Pick-Up
                        </span>
                        <span className="text-xs font-bold text-gray-900">
                          {formatDate(b.startDate)}
                        </span>
                      </div>
                      <div className="text-gray-300 font-bold">→</div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                          Return
                        </span>
                        <span className="text-xs font-bold text-gray-900">
                          {formatDate(b.endDate)}
                        </span>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-4 pb-4 border-b border-gray-100">
                      <div>
                        Duration:{" "}
                        <strong className="text-gray-900">
                          {b.totalDays} {b.totalDays === 1 ? "day" : "days"}
                        </strong>
                      </div>
                      <div>
                        Rate:{" "}
                        <strong className="text-gray-900">
                          ${car?.pricePerDay || (b.totalPrice / (b.totalDays || 1)).toFixed(0)}/day
                        </strong>
                      </div>
                    </div>

                    {/* Host Contact (If available) */}
                    {car?.host?.name && (
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-4 bg-white p-2 rounded-xl border border-gray-100">
                        <span className="flex items-center gap-1">
                          <span>👤 Host:</span>
                          <span className="font-semibold text-gray-800">{car.host.name}</span>
                        </span>
                        {car.host.phoneNumber && (
                          <a
                            href={`tel:${car.host.phoneNumber}`}
                            className="text-brand-primary font-bold hover:underline"
                          >
                            📞 Call
                          </a>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-auto flex flex-col gap-2 pt-2">
                      {isPending ? (
                        <>
                          <Link
                            href={`/booking/checkout?bookingId=${b._id}`}
                            className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-brand-primary hover:bg-brand-hover text-white text-center shadow-md hover:shadow-lg transition-all"
                          >
                            💳 Complete KHQR Payment
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleCancel(b._id)}
                            disabled={cancellingId === b._id}
                            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 transition-colors cursor-pointer"
                          >
                            {cancellingId === b._id ? "Cancelling…" : "Cancel Hold"}
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/booking?carId=${car?._id || ""}`}
                            className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 text-center transition-colors"
                          >
                            View Car Specs
                          </Link>
                          {isCanCancel && (
                            <button
                              type="button"
                              onClick={() => handleCancel(b._id)}
                              disabled={cancellingId === b._id}
                              className="px-3 py-2.5 rounded-xl font-bold text-xs border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-500 transition-colors cursor-pointer"
                            >
                              {cancellingId === b._id ? "…" : "Cancel"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

export default function MyBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
          Loading your bookings…
        </div>
      }
    >
      <MyBookingsContent />
    </Suspense>
  );
}

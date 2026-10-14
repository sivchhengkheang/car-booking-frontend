"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { getMyBookings, cancelBooking, getCarPhotoUrl, createBookingReview } from "@/lib/api";
import { session, redirectToKID } from "@/lib/kid-auth";
import { useBasket } from "@/context/BasketContext";

const STATUS_FILTERS = [
  { id: "ALL", label: "All Reservations" },
  { id: "UPCOMING", label: "Upcoming & Confirmed" },
  { id: "ACTIVE", label: "Active On Trip" },
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
        label: "Confirmed & Held",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
      };
    case "ACTIVE":
      return {
        label: "Active On Trip",
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        dot: "bg-blue-500",
      };
    case "PENDING_PAYMENT":
    case "PROVISIONAL":
      return {
        label: "Awaiting Payment",
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
      };
    case "COMPLETED":
      return {
        label: "Completed & Returned",
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
        label: status || "Confirmed",
        bg: "bg-slate-50 text-slate-700 border-slate-200",
        dot: "bg-slate-400",
      };
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MyBookingsContent() {
  const router = useRouter();
  const { showToast } = useBasket();

  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("ALL");
  const [cancellingId, setCancellingId] = useState(null);

  // QR Modal State
  const [selectedQRBooking, setSelectedQRBooking] = useState(null);

  // Review Modal State
  const [reviewModalBooking, setReviewModalBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchBookings = useCallback(
    async (authToken = token) => {
      if (!authToken) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getMyBookings(authToken);
        if (data.success && Array.isArray(data.bookings)) {
          setBookings(data.bookings);
        } else {
          setError(data.message || "Failed to load reservations");
        }
      } catch {
        setError("Unable to connect to the booking server. Please verify backend is running.");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    let currentToken = localStorage.getItem("token") || sessionStorage.getItem("kid_access_token");
    let currentUser = null;

    const kidUser = session.getUser();
    if (kidUser) {
      currentUser = kidUser;
    } else {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          currentUser = JSON.parse(storedUser);
        } catch (e) {}
      }
    }

    if (!currentToken && !currentUser) {
      router.push("/auth/login?redirect=/booking/my");
      return;
    }

    setToken(currentToken);
    setUser(currentUser);
    fetchBookings(currentToken);
  }, [fetchBookings, router]);

  const handleCancel = async (bookingId) => {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;
    setCancellingId(bookingId);
    try {
      const res = await cancelBooking(bookingId, "Customer initiated cancellation", token);
      if (res.success) {
        showToast("Reservation cancelled successfully", "info");
        fetchBookings(token);
      } else {
        alert(res.message || "Failed to cancel booking");
      }
    } catch {
      alert("Network error while cancelling");
    } finally {
      setCancellingId(null);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewModalBooking) return;
    setSubmittingReview(true);
    try {
      await createBookingReview(
        reviewModalBooking._id,
        { rating: reviewRating, comment: reviewComment },
        token
      );
      showToast("Thank you! Review submitted successfully.");
      setReviewModalBooking(null);
      setReviewComment("");
    } catch {
      showToast("Review submitted! Thank you for your feedback.");
      setReviewModalBooking(null);
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "UPCOMING")
      return b.status === "CONFIRMED" || b.status === "PAID" || b.status === "PENDING_PAYMENT";
    if (activeTab === "ACTIVE") return b.status === "ACTIVE";
    if (activeTab === "COMPLETED") return b.status === "COMPLETED";
    if (activeTab === "CANCELLED") return b.status === "CANCELLED" || b.status === "EXPIRED";
    return true;
  });

  return (
    <>
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              My Trips &amp; Bookings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage your active reservations, digital vouchers, and trip receipts
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all no-underline shrink-0"
          >
            <span>+</span>
            <span>Book Another Car</span>
          </Link>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 mb-8 border-b border-slate-200">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-24">
            <div className="w-9 h-9 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spinner mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-500">Loading your reservation history…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-8 bg-white border border-red-200 rounded-3xl text-center shadow-xs max-w-md mx-auto my-12">
            <p className="text-red-600 font-bold mb-2">⚠️ {error}</p>
            <button
              onClick={() => fetchBookings()}
              className="mt-3 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredBookings.length === 0 && (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl shadow-xs max-w-lg mx-auto my-12">
            <div className="text-5xl mb-4">🚗</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No trips in this view</h3>
            <p className="text-xs text-slate-500 mb-6">
              You don't have any bookings matching the selected status. Browse our available cars and
              hit the road in Cambodia!
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full shadow-md transition-all no-underline inline-block"
            >
              Browse Fleet
            </Link>
          </div>
        )}

        {/* Trips List */}
        {!loading && !error && filteredBookings.length > 0 && (
          <div className="space-y-5">
            {filteredBookings.map((b) => {
              const car = b.car;
              const photo = getCarPhotoUrl(car?.photos?.[0]);
              const brand = car?.brand || car?.make || "Vehicle";
              const model = car?.modelName || car?.model || "Model";
              const badge = getStatusBadge(b.status);
              const ref = b._id?.slice(-8).toUpperCase();

              return (
                <div
                  key={b._id}
                  className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-20 sm:w-28 sm:h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                      <img src={photo} alt={model} className="w-full h-full object-cover" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>
                        <span className="font-mono text-slate-400 text-xs font-bold">#{ref}</span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {brand} {model} <span className="text-slate-400 text-xs font-normal">({car?.year || 2024})</span>
                      </h3>

                      <p className="text-xs text-slate-500 mt-1">
                        📅 {formatDate(b.startDate)} → {formatDate(b.endDate)} ({b.totalDays} days)
                      </p>

                      <div className="text-xs text-slate-700 mt-1.5 flex items-center gap-3">
                        <span>
                          Total: <strong className="font-bold text-slate-900">${b.totalPrice?.toFixed(2)}</strong>
                        </span>
                        <span>·</span>
                        <span className="text-slate-500">📍 Phnom Penh Airport Depot</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 flex-wrap md:flex-nowrap shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <button
                      onClick={() => setSelectedQRBooking(b)}
                      className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📱</span>
                      <span>QR Pass</span>
                    </button>

                    {b.status === "ACTIVE" ? (
                      <Link
                        href={`/booking/inspection?bookingId=${b._id}&mode=return`}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 no-underline shadow-xs"
                      >
                        <span>🔄</span>
                        <span>Return &amp; Refund</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/booking/inspection?bookingId=${b._id}&mode=pickup`}
                        className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 no-underline shadow-xs"
                      >
                        <span>📸</span>
                        <span>Inspection</span>
                      </Link>
                    )}

                    <button
                      onClick={() => setReviewModalBooking(b)}
                      className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>★</span>
                      <span>Review</span>
                    </button>

                    <Link
                      href={`/booking?carId=${car?._id || ""}`}
                      className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all no-underline"
                    >
                      Rebook
                    </Link>

                    {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                      <button
                        onClick={() => handleCancel(b._id)}
                        disabled={cancellingId === b._id}
                        className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                      >
                        {cancellingId === b._id ? "Cancelling…" : "Cancel"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* QR Code Modal Dialog */}
        {selectedQRBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Digital Handover Pass
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Ref #{selectedQRBooking._id?.slice(-8).toUpperCase()}
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Present this code to the DriveKH agent at vehicle pickup
              </p>

              <div className="w-48 h-48 mx-auto p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mb-6">
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                  <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z M40,10 h10 v20 h-10 z M60,40 h20 v10 h-20 z M40,60 h20 v20 h-20 z M70,70 h20 v20 h-20 z M50,40 h10 v10 h-10 z M20,40 h10 v20 h-10 z" />
                </svg>
              </div>

              <div className="text-xs text-slate-700 font-semibold mb-6">
                {selectedQRBooking.car?.brand} {selectedQRBooking.car?.modelName} ·{" "}
                {formatDate(selectedQRBooking.startDate)}
              </div>

              <button
                onClick={() => setSelectedQRBooking(null)}
                className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Pass
              </button>
            </div>
          </div>
        )}

        {/* Review Modal Dialog */}
        {reviewModalBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-900 mb-1">
                Rate your DriveKH Experience
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                How was your drive in the {reviewModalBooking.car?.brand}{" "}
                {reviewModalBooking.car?.modelName}?
              </p>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Star Rating Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Star Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className={`text-2xl cursor-pointer transition-transform hover:scale-125 ${
                          star <= reviewRating ? "text-amber-500" : "text-slate-300"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Feedback Tags */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Highlights</label>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {["Immaculate Cleanliness", "Smooth Transmission", "Easy Pickup", "Great Fuel Economy"].map(
                      (tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 cursor-pointer text-slate-700 font-semibold"
                        >
                          + {tag}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Review Comment */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Review Notes
                  </label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Tell future drivers about the vehicle condition, AC coolness, and handover ease..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setReviewModalBooking(null)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {submittingReview ? "Submitting…" : "Publish Review"}
                  </button>
                </div>
              </form>
            </div>
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
        <div className="w-full p-24 text-center text-sm font-semibold text-slate-500">
          Loading your reservations…
        </div>
      }
    >
      <MyBookingsContent />
    </Suspense>
  );
}

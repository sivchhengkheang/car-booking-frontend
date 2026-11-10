"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrCode, Camera, Star, RotateCcw, Calendar, MapPin, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getMyBookings, cancelBooking, getCarPhotoUrl, createBookingReview } from "@/lib/api";
import { session } from "@/lib/kid-auth";
import { useBasket } from "@/context/BasketContext";

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "UPCOMING", label: "Upcoming" },
  { id: "ACTIVE", label: "On Trip" },
  { id: "COMPLETED", label: "Completed" },
  { id: "CANCELLED", label: "Cancelled" },
];

function getStatusBadge(status) {
  switch (status) {
    case "PAID":
    case "CONFIRMED":
      return { label: "Confirmed", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "ACTIVE":
      return { label: "On Trip", bg: "bg-blue-50 text-blue-700 border-blue-200" };
    case "PENDING_PAYMENT":
    case "PROVISIONAL":
      return { label: "Pending", bg: "bg-amber-50 text-amber-700 border-amber-200" };
    case "COMPLETED":
      return { label: "Completed", bg: "bg-slate-100 text-slate-700 border-slate-200" };
    case "CANCELLED":
    case "EXPIRED":
      return { label: "Cancelled", bg: "bg-rose-50 text-rose-700 border-rose-200" };
    default:
      return { label: status || "Confirmed", bg: "bg-slate-50 text-slate-700 border-slate-200" };
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MyBookingsContent() {
  const router = useRouter();
  const { showToast } = useBasket();

  const [token, setToken] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("ALL");
  const [cancellingId, setCancellingId] = useState(null);

  const [selectedQRBooking, setSelectedQRBooking] = useState(null);
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
        setError("Unable to connect to the booking server.");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentToken = localStorage.getItem("token") || sessionStorage.getItem("kid_access_token");
    let currentUser = session.getUser();
    if (!currentUser) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          currentUser = JSON.parse(storedUser);
        } catch {}
      }
    }

    if (!currentToken && !currentUser) {
      router.push("/auth/login?redirect=/booking/my");
      return;
    }

    setToken(currentToken);
    fetchBookings(currentToken);
  }, [fetchBookings, router]);

  const handleCancel = async (bookingId) => {
    if (!confirm("Cancel this reservation?")) return;
    setCancellingId(bookingId);
    try {
      const res = await cancelBooking(bookingId, "Customer initiated cancellation", token);
      if (res.success) {
        showToast("Reservation cancelled", "info");
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
      showToast("Review submitted");
      setReviewModalBooking(null);
      setReviewComment("");
    } catch {
      showToast("Review submitted");
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

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Trips</h1>
            <p className="text-xs text-slate-500 mt-0.5">Upcoming and past reservations</p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 hover:bg-blue-600 text-white font-semibold text-xs transition-colors no-underline shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book a car</span>
          </Link>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-3 mb-6 border-b border-slate-200">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="space-y-4" aria-busy="true" aria-label="Loading trips">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-24 h-18 rounded-xl skeleton-shimmer shrink-0" />
                  <div className="space-y-2">
                    <div className="h-4 w-28 rounded skeleton-shimmer" />
                    <div className="h-5 w-44 rounded skeleton-shimmer" />
                    <div className="h-3.5 w-52 rounded skeleton-shimmer" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-16 rounded-lg skeleton-shimmer" />
                  <div className="h-8 w-24 rounded-lg skeleton-shimmer" />
                  <div className="h-8 w-16 rounded-lg skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="p-6 bg-white border border-rose-200 rounded-2xl text-center max-w-md mx-auto my-10">
            <p className="text-sm text-rose-600 font-semibold mb-3">{error}</p>
            <button
              type="button"
              onClick={() => fetchBookings()}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredBookings.length === 0 && (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl max-w-md mx-auto my-10">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No trips found</h3>
            <p className="text-xs text-slate-500 mb-5">No bookings match this filter.</p>
            <Link
              href="/"
              className="px-5 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold rounded-full no-underline inline-block"
            >
              Browse cars
            </Link>
          </div>
        )}

        {!loading && !error && filteredBookings.length > 0 && (
          <div className="space-y-4">
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
                  className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-24 h-18 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      <img src={photo} alt={model} className="w-full h-full object-cover" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="font-mono text-slate-400 text-xs">#{ref}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {brand} {model} <span className="text-slate-400 font-normal">{car?.year || 2024}</span>
                      </h3>

                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{formatDate(b.startDate)} – {formatDate(b.endDate)} ({b.totalDays}d)</span>
                      </p>

                      <div className="text-xs text-slate-600 mt-1 flex items-center gap-2.5">
                        <span className="font-semibold text-slate-900">${b.totalPrice?.toFixed(2)}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3 h-3" />
                          {car?.location?.city || "Phnom Penh"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedQRBooking(b)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Pass</span>
                    </button>

                    {b.status === "ACTIVE" ? (
                      <Link
                        href={`/booking/inspection?bookingId=${b._id}&mode=return`}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 no-underline"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Return</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/booking/inspection?bookingId=${b._id}&mode=pickup`}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 no-underline"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Inspection</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => setReviewModalBooking(b)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </button>

                    <Link
                      href={`/booking?carId=${car?._id || ""}`}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold no-underline"
                    >
                      Rebook
                    </Link>

                    {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(b._id)}
                        disabled={cancellingId === b._id}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
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

        {/* QR Pass Modal */}
        {selectedQRBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl border border-slate-200">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Pick-up Pass
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5 mb-4">
                #{selectedQRBooking._id?.slice(-8).toUpperCase()}
              </h3>

              <div className="w-40 h-40 mx-auto p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center mb-4">
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                  <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z M40,10 h10 v20 h-10 z M60,40 h20 v10 h-20 z M40,60 h20 v20 h-20 z M70,70 h20 v20 h-20 z M50,40 h10 v10 h-10 z M20,40 h10 v20 h-10 z" />
                </svg>
              </div>

              <div className="text-xs text-slate-600 font-medium mb-4">
                {selectedQRBooking.car?.brand} {selectedQRBooking.car?.modelName} ·{" "}
                {formatDate(selectedQRBooking.startDate)}
              </div>

              <button
                type="button"
                onClick={() => setSelectedQRBooking(null)}
                className="w-full py-2.5 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {reviewModalBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Rate your trip</h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-5">
                {reviewModalBooking.car?.brand} {reviewModalBooking.car?.modelName}
              </p>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`text-2xl cursor-pointer ${
                        star <= reviewRating ? "text-amber-400" : "text-slate-200"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {["Clean car", "Smooth drive", "Easy pick-up", "Great value"].map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() =>
                        setReviewComment((prev) => (prev ? `${prev}, ${tag}` : tag))
                      }
                      className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 cursor-pointer text-slate-700 text-xs font-medium"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience…"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-600"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalBooking(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {submittingReview ? "Submitting…" : "Submit"}
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

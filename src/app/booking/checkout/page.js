"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getMyBookings, checkoutPayment } from "@/lib/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [paying,  setPaying]    = useState(false);
  const [error,   setError]     = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/auth/login"); return; }
    if (!bookingId) { router.push("/"); return; }

    getMyBookings(token).then((data) => {
      if (data.success) {
        const found = (data.bookings || []).find((b) => b._id === bookingId);
        if (found) setBooking(found);
        else setError("Booking not found");
      } else {
        setError(data.message || "Could not load booking");
      }
    }).catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [bookingId, router]);

  async function handlePay() {
    const token = getToken();
    if (!token) { router.push("/auth/login"); return; }

    setPaying(true);
    setError(null);
    try {
      const data = await checkoutPayment(bookingId, token);
      const paymentUrl =
        data.paymentUrl ||
        data.checkout?.paymentUrl ||
        data.data?.paymentUrl;

      if (data.success && paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        setError(data.message || "Could not create payment intent");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setPaying(false);
    }
  }

  if (loading) return (
    <>
      <Navbar />
      <div className="text-center py-32">
        <div className="w-9 h-9 border-3 border-gray-200 border-t-brand-primary rounded-full animate-spinner mx-auto mb-4" />
        <p className="text-sm text-gray-500">Loading your booking…</p>
      </div>
    </>
  );

  if (error && !booking) return (
    <>
      <Navbar />
      <div className="max-w-md mx-auto mt-16 p-8 bg-red-50 border border-red-200 rounded-3xl text-center shadow-sm">
        <p className="text-red-600 font-bold mb-4">⚠️ {error}</p>
        <Link href="/" className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-full text-xs font-bold text-gray-900 hover:bg-gray-50 no-underline">
          ← Back to home
        </Link>
      </div>
    </>
  );

  const car   = booking?.car;
  const start = booking?.startDate ? new Date(booking.startDate) : null;
  const end   = booking?.endDate   ? new Date(booking.endDate)   : null;

  return (
    <>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Steps */}
        <div className="flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-wider mb-10">
          <div className="flex items-center gap-2 text-brand-success">
            <div className="w-5 h-5 rounded-full bg-brand-success/20 flex items-center justify-center text-[10px]">✓</div>
            <span>Dates</span>
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className="flex items-center gap-2 text-gray-900">
            <div className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px]">2</div>
            <span>Pay</span>
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">3</div>
            <span>Confirm</span>
          </div>
        </div>

        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-extrabold text-gray-900">
              Review & Pay
            </h1>
            <Link href={`/booking?carId=${car?._id}`} className="text-sm font-bold text-brand-primary hover:underline">
              Change Dates
            </Link>
          </div>
          
          <p className="text-sm text-gray-500 mb-8">
            Confirm your rental details before proceeding to secure payment.
          </p>

          {/* Booking summary card */}
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                🚗
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg text-gray-900 truncate">
                  {car?.make || car?.brand} {car?.model}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {car?.year} · {car?.type || car?.category || "Sedan"}
                </div>
              </div>
              <span className="shrink-0 bg-yellow-100 text-yellow-800 text-[10px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wide">
                Provisional
              </span>
            </div>

            <div className="h-px bg-gray-200 my-4" />

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Booking ID</span>
                <span className="font-mono text-gray-900 uppercase">#{booking?._id?.slice(-8)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Check-in</span>
                <span className="font-medium text-gray-900">
                  {start ? start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Check-out</span>
                <span className="font-medium text-gray-900">
                  {end ? end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Duration</span>
                <span className="font-medium text-gray-900">{booking?.totalDays} day{booking?.totalDays > 1 ? "s" : ""}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Rate</span>
                <span className="font-medium text-gray-900">${car?.pricePerDay}/day</span>
              </div>
            </div>

            <div className="h-px bg-gray-200 my-4" />
            
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900">Total Due</span>
              <span className="text-xl font-extrabold text-gray-900">${booking?.totalPrice?.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment methods info */}
          <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 mb-6">
            <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-3">
              Accepted Payment Methods
            </p>
            <div className="flex gap-2 flex-wrap mb-3">
              {[
                { name: "ABA Pay", icon: "🏦" },
                { name: "ACLEDA", icon: "🏛️" },
                { name: "Wing", icon: "🦋" },
                { name: "Sathapana", icon: "💳" },
              ].map((b) => (
                <div key={b.name} className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 shadow-sm">
                  <span>{b.icon}</span> {b.name}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Powered by <strong className="text-brand-primary">Baray</strong> — Cambodia's unified payment API. You'll select your bank on the next page.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl mb-6">
              <p className="text-sm text-red-600 font-bold">⚠️ {error}</p>
            </div>
          )}

          <button
            className="w-full py-4 px-6 rounded-2xl text-base font-bold bg-brand-primary hover:bg-brand-hover text-white shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            onClick={handlePay}
            disabled={paying}
          >
            {paying ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spinner" />
                Creating payment intent…
              </>
            ) : (
              <>Pay ${booking?.totalPrice?.toFixed(2)} via Baray →</>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            🔒 You will be securely redirected to pay.baray.io to complete payment
          </p>
        </div>
      </main>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <>
        <Navbar />
        <div className="text-center py-32 text-gray-500">Loading checkout...</div>
      </>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

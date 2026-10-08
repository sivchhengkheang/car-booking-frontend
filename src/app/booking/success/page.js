"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getMyBookings } from "@/lib/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token || !bookingId) { setLoading(false); return; }

    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const data = await getMyBookings(token);
        if (cancelled) return;
        if (data.success) {
          const found = (data.bookings || []).find((b) => b._id === bookingId);
          if (found) {
            setBooking(found);
            if (found.paymentStatus === "PENDING" && attempts < 3) {
              attempts++;
              setTimeout(poll, 1500);
              return;
            }
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch booking status:", err);
        setError("Could not reach the server. Please check your bookings manually.");
      }
      if (!cancelled) setLoading(false);
    };

    poll();
    return () => { cancelled = true; };
  }, [bookingId]);

  const car   = booking?.car;
  const start = booking?.startDate ? new Date(booking.startDate) : null;
  const end   = booking?.endDate   ? new Date(booking.endDate)   : null;
  const ref   = booking?._id?.slice(-8).toUpperCase() || "—";
  const isPaid = booking?.paymentStatus === "PAID";

  const BANK_NAMES = { aba: "ABA Bank", acleda: "ACLEDA Bank", spn: "Sathapana Bank", wing: "Wing" };
  const bankName  = BANK_NAMES[booking?.paymentDetails?.bank] || "Baray Payment";

  if (loading) return (
    <>
      <Navbar />
      <div className="text-center py-32">
        <div className="w-9 h-9 border-3 border-gray-200 border-t-brand-primary rounded-full animate-spinner mx-auto mb-4" />
        <p className="text-sm text-gray-500">Confirming your payment…</p>
      </div>
    </>
  );

  if (error) return (
    <>
      <Navbar />
      <div className="max-w-md mx-auto mt-16 p-8 bg-red-50 border border-red-200 rounded-3xl text-center shadow-sm">
        <p className="text-4xl mb-4">⚠️</p>
        <p className="text-red-600 font-bold mb-6">{error}</p>
        <Link href="/" className="inline-block px-6 py-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 hover:bg-gray-50 transition-all shadow-sm no-underline">
          Go Home
        </Link>
      </div>
    </>
  );

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
          <div className="flex items-center gap-2 text-brand-success">
            <div className="w-5 h-5 rounded-full bg-brand-success/20 flex items-center justify-center text-[10px]">✓</div>
            <span>Pay</span>
          </div>
          <div className="w-8 h-px bg-gray-300"></div>
          <div className="flex items-center gap-2 text-gray-900">
            <div className="w-5 h-5 rounded-full bg-gray-900 text-white flex items-center justify-center text-[10px]">3</div>
            <span>Confirm</span>
          </div>
        </div>

        <div className="max-w-xl mx-auto text-center">
          <div className="w-20 h-20 bg-brand-success/10 text-brand-success rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
            {isPaid ? "✅" : "⏳"}
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            {isPaid ? "Booking Confirmed!" : "Payment Received"}
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            {isPaid
              ? `Your payment was processed via ${bankName}. Show your reference code at pickup.`
              : "Your booking is being confirmed. This usually takes a few seconds."}
          </p>

          <div className="bg-white border border-gray-200 rounded-3xl p-8 text-left shadow-xl mb-8">
            <div className="bg-amber-50 border border-amber-200 border-dashed rounded-2xl p-6 text-center mb-8">
              <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest mb-1">
                Booking Reference
              </p>
              <p className="text-4xl font-black font-mono text-amber-600 tracking-widest my-2">
                #{ref}
              </p>
              <p className="text-xs text-amber-700/70 mt-1">
                Present this code when picking up your vehicle
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Vehicle</span>
                <span className="font-bold text-gray-900">{car?.make} {car?.model} ({car?.year})</span>
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
              <div className="h-px bg-gray-200 my-4" />
              <div className="flex justify-between items-center text-base">
                <span className="font-bold text-gray-900">Amount Paid</span>
                <span className="font-extrabold text-gray-900">${booking?.totalPrice?.toFixed(2)}</span>
              </div>

              {isPaid && booking?.paymentDetails?.bank && (
                <div className="flex justify-between items-center text-sm mt-4">
                  <span className="text-gray-500">Payment via</span>
                  <div className="flex items-center gap-2">
                    <span className="bg-brand-success/10 text-brand-success px-2 py-0.5 rounded text-[10px] font-bold">PAID</span>
                    <span className="font-medium text-gray-900">{bankName}</span>
                  </div>
                </div>
              )}

              {isPaid && booking?.paymentDetails?.paidAt && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Paid at</span>
                  <span className="font-medium text-gray-900">
                    {new Date(booking.paymentDetails.paidAt).toLocaleString("en-GB")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="px-6 py-3.5 bg-brand-primary text-white font-bold rounded-xl shadow-md hover:bg-brand-hover hover:shadow-lg transition-all active:scale-98">
              Browse More Cars
            </Link>
            <button
              className="px-6 py-3.5 bg-white border border-gray-300 text-gray-900 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all cursor-pointer flex items-center justify-center gap-2"
              onClick={() => window.print()}
            >
              🖨️ Print Receipt
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-8">
            Questions? Contact the host directly or email support@drivekh.com
          </p>
        </div>
      </main>
    </>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <>
        <Navbar />
        <div className="text-center py-32 text-gray-500">Loading confirmation...</div>
      </>
    }>
      <SuccessContent />
    </Suspense>
  );
}


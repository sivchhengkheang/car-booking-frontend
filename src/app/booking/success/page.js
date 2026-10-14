"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getMyBookings, getCarPhotoUrl } from "@/lib/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("kid_access_token");
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const displayRef = (bookingId || "DKH-749210").replace(/^DKH-/, "").toUpperCase().slice(-8);

  useEffect(() => {
    const token = getToken();
    if (!token || !bookingId || bookingId.startsWith("DKH-")) {
      setLoading(false);
      return;
    }

    getMyBookings(token)
      .then((data) => {
        if (data.success) {
          const found = (data.bookings || []).find((b) => b._id === bookingId);
          if (found) setBooking(found);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookingId]);

  const car = booking?.car;
  const start = booking?.startDate ? new Date(booking.startDate) : new Date();
  const end = booking?.endDate ? new Date(booking.endDate) : new Date(Date.now() + 3 * 86400000);

  // Generate .ics calendar download
  const handleAddToCalendar = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//DriveKH//Car Rental Booking//EN
BEGIN:VEVENT
UID:${displayRef}@drivekh.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART:${start.toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTEND:${end.toISOString().replace(/[-:]/g, "").split(".")[0]}Z
SUMMARY:DriveKH Car Rental: ${car?.brand || "Vehicle"} ${car?.modelName || "Rental"}
DESCRIPTION:Booking Reference #${displayRef}. Pick up at Phnom Penh Airport Depot.
LOCATION:Phnom Penh, Cambodia
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `DriveKH-Rental-${displayRef}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="text-center py-32">
          <div className="w-9 h-9 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spinner mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-500">Confirming your booking details…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl flex items-center justify-center mx-auto mb-4 shadow-sm animate-bounce">
            ✓
          </div>
          <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Payment Verified · Booking Confirmed
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">
            Digital Booking Voucher
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Your vehicle is held and ready for handover. Present this voucher QR code to the station agent.
          </p>
        </div>

        {/* 6-Step Trip Progression Timeline */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 text-center">
            Trip Progression Timeline
          </h3>

          <div className="grid grid-cols-6 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold mb-1 shadow-xs">
                ✓
              </div>
              <span className="font-bold text-slate-900">Booked</span>
              <span className="text-[9px] text-slate-400 hidden sm:inline">Completed</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold mb-1 shadow-xs">
                ✓
              </div>
              <span className="font-bold text-slate-900">Paid</span>
              <span className="text-[9px] text-slate-400 hidden sm:inline">KHQR Baray</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-1 shadow-xs animate-pulse">
                3
              </div>
              <span className="font-bold text-blue-700">Handover</span>
              <span className="text-[9px] text-blue-500 hidden sm:inline">Current Stage</span>
            </div>

            <div className="flex flex-col items-center opacity-40">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold mb-1">
                4
              </div>
              <span className="font-medium text-slate-600">On Trip</span>
              <span className="text-[9px] text-slate-400 hidden sm:inline">Driving</span>
            </div>

            <div className="flex flex-col items-center opacity-40">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold mb-1">
                5
              </div>
              <span className="font-medium text-slate-600">Return</span>
              <span className="text-[9px] text-slate-400 hidden sm:inline">Inspection</span>
            </div>

            <div className="flex flex-col items-center opacity-40">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold mb-1">
                6
              </div>
              <span className="font-medium text-slate-600">Refund</span>
              <span className="text-[9px] text-slate-400 hidden sm:inline">Deposit back</span>
            </div>
          </div>
        </div>

        {/* Voucher & QR Code Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl mb-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                DriveKH Official Voucher Pass
              </span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                Voucher Ref: #{displayRef}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Status: <span className="font-bold text-emerald-600">CONFIRMED &amp; ALLOCATED</span>
              </p>
            </div>

            {/* Pick-up QR Code */}
            <div className="flex flex-col items-center p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="w-28 h-28 bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center shadow-xs">
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                  <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z M40,10 h10 v20 h-10 z M60,40 h20 v10 h-20 z M40,60 h20 v20 h-20 z M70,70 h20 v20 h-20 z M50,40 h10 v10 h-10 z M20,40 h10 v20 h-10 z" />
                </svg>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-600 mt-1.5">
                SCAN AT DEPOT
              </span>
            </div>
          </div>

          {/* Key Rental Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 border-b border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Pick-up Station</span>
              <span className="font-bold text-slate-900">
                Phnom Penh Airport Terminal Depot (PNH)
              </span>
              <span className="text-[11px] text-slate-500 block">
                Counter 4, International Arrivals Terminal
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Rental Duration</span>
              <span className="font-bold text-slate-900">
                {start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} –{" "}
                {end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              <span className="text-[11px] text-slate-500 block">
                Pick-up: 09:00 AM · Return: 06:00 PM
              </span>
            </div>
          </div>

          {/* Host Contact Section */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Assigned Host &amp; Fleet Provider
              </div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">
                Cambodia Premier Fleet Services
              </div>
              <div className="text-[11px] text-slate-500">
                Host Agent: Mr. Vichea (Counter Lead)
              </div>
            </div>

            {/* Direct Contact Buttons */}
            <div className="flex items-center gap-2">
              <a
                href="tel:+85523888999"
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-100 transition-colors flex items-center gap-1.5 no-underline shadow-xs"
              >
                <span>📞</span>
                <span>Call Host</span>
              </a>
              <a
                href="https://t.me/drivekh_support"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors flex items-center gap-1.5 no-underline shadow-xs"
              >
                <span>✈️</span>
                <span>Telegram</span>
              </a>
              <a
                href="https://wa.me/85512345678"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 no-underline shadow-xs"
              >
                <span>💬</span>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Step-by-Step Pickup Instructions */}
          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs space-y-2">
            <div className="font-bold text-blue-900 flex items-center gap-1.5">
              <span>📍</span>
              <span>Pickup Instructions:</span>
            </div>
            <ol className="list-decimal list-inside text-blue-800 space-y-1 pl-1">
              <li>Arrive at Counter 4 inside Phnom Penh Airport Arrivals (or designated station).</li>
              <li>Show the QR code above along with your physical driver's license.</li>
              <li>
                Complete the quick joint walkaround photo handover inspection with our fleet agent.
              </li>
              <li>Collect vehicle keys and receive your inspection pass in-app!</li>
            </ol>
          </div>

          {/* Primary CTA: Start In-App Inspection Handover */}
          <div className="pt-2">
            <Link
              href={`/booking/inspection?bookingId=${bookingId || displayRef}&mode=pickup`}
              className="w-full py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 no-underline text-center cursor-pointer"
            >
              <span>📸</span>
              <span>Start In-App Pickup Inspection (Record Mileage &amp; Photos) →</span>
            </Link>
          </div>

          {/* Action Buttons: Add to Calendar, Get Directions, Print */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleAddToCalendar}
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>📅</span>
                <span>Add to Calendar</span>
              </button>

              <a
                href="https://maps.google.com/?q=Phnom+Penh+International+Airport"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 no-underline cursor-pointer"
              >
                <span>📍</span>
                <span>Depot Map Directions</span>
              </a>

              <button
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>🖨️</span>
                <span>Print Voucher</span>
              </button>
            </div>

            <Link
              href="/booking/my"
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl no-underline"
            >
              My Trips List →
            </Link>
          </div>
        </div>

        {/* 24/7 Roadside Assistance */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
          DriveKH 24/7 Roadside Concierge is on call at{" "}
          <strong className="text-slate-800">+855 23 888 999</strong>
        </div>
      </main>
    </>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full p-24 text-center text-sm font-semibold text-slate-500">
          Loading booking confirmation…
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}

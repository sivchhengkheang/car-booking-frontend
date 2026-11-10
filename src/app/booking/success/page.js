"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Calendar, MapPin, Printer, Camera, Phone } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getMyBookings, getBookingById, getCar, getCarPhotoUrl, getPaymentByBooking } from "@/lib/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("kid_access_token");
}

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyingText, setVerifyingText] = useState("Confirming booking…");

  const displayRef = (bookingId || "DKH-749210").replace(/^DKH-/, "").toUpperCase().slice(-8);

  useEffect(() => {
    const token = getToken();
    if (!token || !bookingId || bookingId.startsWith("DKH-")) {
      setLoading(false);
      return;
    }

    const isExplicitlyCancelled =
      searchParams.get("paymentStatus") === "cancelled" ||
      searchParams.get("paymentStatus") === "failed" ||
      searchParams.get("status") === "cancelled" ||
      searchParams.get("status") === "cancel" ||
      searchParams.get("cancel") === "true";

    if (isExplicitlyCancelled) {
      router.replace(`/booking/checkout?bookingId=${bookingId}&paymentStatus=cancelled`);
      return;
    }

    let isMounted = true;

    const verifyAndLoadBooking = async () => {
      try {
        let found = null;
        let isPaid = false;

        for (let attempt = 0; attempt < 3; attempt++) {
          if (!isMounted) return;

          if (attempt > 0) {
            setVerifyingText("Verifying payment…");
          }

          const bRes = await getBookingById(bookingId, token);
          if (bRes && bRes.success && bRes.booking) {
            found = bRes.booking;
          } else {
            const myRes = await getMyBookings(token);
            if (myRes && myRes.success) {
              found = (myRes.bookings || []).find((b) => b._id === bookingId);
            }
          }

          isPaid = Boolean(
            found &&
            (found.paymentStatus === "PAID" ||
              found.status === "CONFIRMED" ||
              found.status === "PAID")
          );

          if (isPaid) break;

          const pRes = await getPaymentByBooking(bookingId, token).catch(() => null);
          if (pRes?.booking?.paymentStatus === "PAID" || pRes?.payment?.status === "COMPLETED") {
            isPaid = true;
            if (found) found.paymentStatus = "PAID";
            break;
          }

          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 1200));
          }
        }

        if (!isPaid) {
          router.replace(`/booking/checkout?bookingId=${bookingId}&paymentStatus=cancelled`);
          return;
        }

        if (found) {
          try {
            localStorage.removeItem("dkh_checkout_form_draft");
            sessionStorage.removeItem("dkh_checkout_form_draft");
            if (bookingId) {
              localStorage.removeItem(`dkh_checkout_form_draft_${bookingId}`);
              sessionStorage.removeItem(`dkh_checkout_form_draft_${bookingId}`);
            }
          } catch {}
          if (typeof found.car === "string") {
            const cRes = await getCar(found.car);
            if (cRes && cRes.success) {
              found.car = cRes.car || cRes.data;
            }
          }
          if (isMounted) setBooking(found);
        }
      } catch (err) {
        console.error("Error verifying booking payment:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    verifyAndLoadBooking();

    return () => {
      isMounted = false;
    };
  }, [bookingId, router, searchParams]);

  const car = booking?.car;
  const start = booking?.startDate ? new Date(booking.startDate) : new Date();
  const end = booking?.endDate ? new Date(booking.endDate) : new Date(Date.now() + 3 * 86400000);

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

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="text-center py-32">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spinner mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">{verifyingText}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Confirmation Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Booking confirmed
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Reference <span className="font-mono font-semibold text-slate-800">#{displayRef}</span>
          </p>
        </div>

        {/* Unified Voucher Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
          {/* Vehicle & QR Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                <img
                  src={getCarPhotoUrl(car?.photos?.[0] || car?.photo)}
                  alt={`${car?.brand || car?.make || "Car"} ${car?.modelName || car?.model || ""}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {car?.brand || car?.make || "Vehicle"} {car?.modelName || car?.model || "Car"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {car?.year || 2024} · {car?.transmission || "Automatic"} · {car?.seats || 5} seats
                </p>
                <p className="text-xs font-semibold text-emerald-700 mt-1">
                  Paid: ${booking?.totalPrice ? Number(booking.totalPrice).toFixed(2) : "0.00"}
                </p>
              </div>
            </div>

            {/* Compact Pick-up QR */}
            <div className="flex sm:flex-col items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl self-start sm:self-center">
              <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg p-1.5 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                  <path d="M0,0 h30 v30 h-30 z M10,10 h10 v10 h-10 z M70,0 h30 v30 h-30 z M80,10 h10 v10 h-10 z M0,70 h30 v30 h-30 z M10,80 h10 v10 h-10 z M40,10 h10 v20 h-10 z M60,40 h20 v10 h-20 z M40,60 h20 v20 h-20 z M70,70 h20 v20 h-20 z M50,40 h10 v10 h-10 z M20,40 h10 v20 h-10 z" />
                </svg>
              </div>
              <span className="text-[10px] font-mono font-semibold text-slate-500">PICK-UP PASS</span>
            </div>
          </div>

          {/* Dates & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pb-5 border-b border-slate-100">
            <div>
              <span className="text-slate-400 block mb-0.5">Dates</span>
              <span className="font-semibold text-slate-900">
                {start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} –{" "}
                {end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Pick-up location</span>
              <span className="font-semibold text-slate-900">
                {car?.location?.city || "Phnom Penh"} · Counter 4, Airport Arrivals
              </span>
            </div>
          </div>

          {/* Primary CTA */}
          <Link
            href={`/booking/inspection?bookingId=${bookingId || displayRef}&mode=pickup`}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 no-underline"
          >
            <Camera className="w-4 h-4" />
            <span>Start pick-up inspection</span>
          </Link>

          {/* Secondary Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAddToCalendar}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>

              <a
                href="https://maps.google.com/?q=Phnom+Penh+International+Airport"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1.5 no-underline"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Directions</span>
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>

            <Link
              href="/booking/my"
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold no-underline"
            >
              My trips
            </Link>
          </div>
        </div>

        {/* Support Contact */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-600">
          <span>24/7 support: <strong className="text-slate-900">+855 23 888 999</strong></span>
          <div className="flex items-center gap-2">
            <a
              href="tel:+85523888999"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium no-underline"
            >
              <Phone className="w-3 h-3" />
              <span>Call</span>
            </a>
            <a
              href="https://t.me/drivekh_support"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium no-underline"
            >
              Telegram
            </a>
          </div>
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

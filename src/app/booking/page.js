"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getCar, getCarBookedDates, createBooking } from "@/lib/api";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const SAMPLE_GALLERY_PHOTOS = [
  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80"
];

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isInRange(day, start, end) {
  if (!start || !end) return false;
  return day > start && day < end;
}

function isDateBooked(day, bookedDates) {
  return bookedDates.some(b => {
    const s = new Date(b.start); s.setHours(0, 0, 0, 0);
    const e = new Date(b.end); e.setHours(23, 59, 59, 999);
    return day >= s && day <= e;
  });
}

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const carId = searchParams.get("carId");

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  // Calendar state
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [bookedDates, setBookedDates] = useState([]);

  useEffect(() => {
    if (!carId) { setError("No vehicle selected"); setLoading(false); return; }

    Promise.all([
      getCar(carId),
      getCarBookedDates(carId)
    ]).then(([carData, bookingsData]) => {
      if (carData.success) setCar(carData.car || carData.data);
      else setError("Vehicle record not found");

      if (bookingsData.success) {
        setBookedDates(bookingsData.bookedDates.map(b => ({
          start: new Date(b.startDate),
          end: new Date(b.endDate)
        })));
      }
    }).catch(() => setError("Could not connect to server"))
      .finally(() => setLoading(false));
  }, [carId]);

  // Build calendar days array for a given view date (month offset)
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

  function handleDayClick(day) {
    if (!day) return;
    if (day < today) return;
    if (isDateBooked(day, bookedDates)) return;

    if (!startDate || (startDate && endDate)) {
      setStartDate(day); setEndDate(null);
    } else {
      if (day <= startDate) { setStartDate(day); setEndDate(null); }
      else {
        // Ensure no booked dates fall in the range
        let hasOverlap = false;
        let current = new Date(startDate);
        while (current <= day) {
          if (isDateBooked(current, bookedDates)) {
            hasOverlap = true;
            break;
          }
          current.setDate(current.getDate() + 1);
        }

        if (hasOverlap) {
          setError("Cannot select range that includes already booked dates");
          setTimeout(() => setError(null), 3000);
          setStartDate(day);
          setEndDate(null);
        } else {
          setEndDate(day);
        }
      }
    }
  }

  function prevMonth() {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  }

  const totalDays = startDate && endDate
    ? Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)))
    : 0;
  const totalPrice = car ? totalDays * car.pricePerDay : 0;
  const serviceFee = totalPrice > 0 ? 15 : 0;
  const grandTotal = totalPrice + serviceFee;

  async function handleSubmit() {
    if (!startDate || !endDate) { setError("Please select valid pick-up and return dates"); return; }
    const token = getToken();
    if (!token) { router.push("/auth/login?redirect=/booking?carId=" + carId); return; }

    setSubmitting(true);
    setError(null);
    try {
      const data = await createBooking({
        carId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }, token);
      if (data.success) {
        router.push(`/booking/checkout?bookingId=${data.booking._id}`);
      } else {
        setError(data.message || "Failed to create booking reservation");
      }
    } catch {
      setError("Network connection error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  const month1 = buildDaysForMonth(0);
  const month2 = buildDaysForMonth(1);

  if (loading) return (
    <div className="text-center py-32">
      <div className="w-9 h-9 border-3 border-gray-200 border-t-brand-primary rounded-full animate-spinner mx-auto mb-4" />
      <p className="text-sm text-gray-500">Loading vehicle listing details…</p>
    </div>
  );

  const brand = car?.brand || car?.make || "Toyota";
  const model = car?.modelName || car?.model || "Camry";
  const city = car?.location?.city || car?.location?.address || "Phnom Penh, Cambodia";

  return (
    <>
      <Navbar />

      <main className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-6">
        {/* Listing Title Bar */}
        <div className="mb-5">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            {brand} {model} ({car?.year || 2024})
          </h1>
          <div className="flex items-center justify-between flex-wrap gap-4 text-sm text-gray-900">
            <div className="flex items-center gap-2">
              <span>★</span>
              <span className="font-bold">4.92</span>
              <span>·</span>
              <span className="underline cursor-pointer">32 reviews</span>
              <span>·</span>
              <span className="bg-white text-gray-900 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-sm border border-gray-200">
                🏆 Superhost
              </span>
              <span>·</span>
              <span className="text-gray-500">📍 {city}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-300 text-gray-900 hover:bg-gray-50 cursor-pointer transition-all"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
              >
                📤 Share
              </button>
              <button
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white border border-gray-300 text-gray-900 hover:bg-gray-50 cursor-pointer transition-all"
                onClick={() => setSaved(!saved)}
              >
                {saved ? "❤️ Saved" : "🤍 Save"}
              </button>
            </div>
          </div>
        </div>

        {/* Airbnb 5-Photo Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-2 rounded-3xl overflow-hidden mb-10 h-[420px]">
          <img
            src={car?.photos?.[0] || SAMPLE_GALLERY_PHOTOS[0]}
            alt={model}
            className="col-span-1 row-span-2 w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
          <img
            src={car?.photos?.[1] || SAMPLE_GALLERY_PHOTOS[1]}
            alt={model}
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
          <img
            src={car?.photos?.[2] || SAMPLE_GALLERY_PHOTOS[2]}
            alt={model}
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
          <img
            src={car?.photos?.[3] || SAMPLE_GALLERY_PHOTOS[3]}
            alt={model}
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
          <img
            src={car?.photos?.[4] || SAMPLE_GALLERY_PHOTOS[4]}
            alt={model}
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
        </div>

        {/* Content & Sticky Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-14 items-start">
          {/* Left: Vehicle Overview, Host, Features, Calendar */}
          <div>
            {/* Hosted Info Header */}
            <div className="flex items-center justify-between pb-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Vehicle hosted by {car?.host?.name || "Cambodia Premium Rentals"}
                </h2>
                <p className="text-gray-500 text-sm">
                  {car?.seats || 5} seats · {car?.transmission || "Automatic"} · {car?.fuelType || "Gasoline"} · Verified License
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-gray-500 text-white flex items-center justify-center text-xl font-bold">
                👤
              </div>
            </div>

            {/* Airbnb Key Highlights */}
            <div className="py-7 border-b border-gray-200 flex flex-col gap-5">
              <div className="flex gap-4">
                <span className="text-2xl">🌟</span>
                <div>
                  <div className="font-bold text-sm text-gray-900">Experienced Superhost</div>
                  <div className="text-gray-500 text-xs mt-0.5">Superhosts are top-rated, highly experienced vehicle providers.</div>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-2xl">📱</span>
                <div>
                  <div className="font-bold text-sm text-gray-900">Instant KHQR Baray Payment</div>
                  <div className="text-gray-500 text-xs mt-0.5">Seamlessly pay via ABA, ACLEDA, Wing or Sathapana mobile banking.</div>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-2xl">🛡️</span>
                <div>
                  <div className="font-bold text-sm text-gray-900">Free AirCover Insurance</div>
                  <div className="text-gray-500 text-xs mt-0.5">Includes collision damage waiver and 24/7 roadside assistance.</div>
                </div>
              </div>
            </div>

            {/* Vehicle Description */}
            <div className="py-7 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3">About this vehicle</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {car?.description ||
                  `Experience Cambodia in full comfort and style with this immaculate ${brand} ${model}. Meticulously inspected, sanitized, and maintained to standard. Features modern infotainment, smooth automated transmission, and fuel-efficient performance.`}
              </p>
            </div>

            {/* Calendar Section */}
            <div className="py-8">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Select Rental Dates
              </h3>
              <p className="text-gray-500 text-xs mb-4">
                Pick your check-in and return dates to unlock availability.
              </p>

              <div className="max-w-4xl bg-white border border-gray-200 rounded-3xl p-6 shadow-sm overflow-x-auto">
                <div className="flex items-center justify-between mb-5">
                  <button className="bg-transparent border-0 text-gray-900 cursor-pointer text-xl hover:bg-gray-100 p-2 rounded-full" onClick={prevMonth}>‹</button>
                  <div className="flex gap-20">
                    <span className="font-bold text-sm text-gray-900 hidden sm:block">
                      {MONTH_NAMES[month1.month]} {month1.year}
                    </span>
                    <span className="font-bold text-sm text-gray-900 hidden sm:block">
                      {MONTH_NAMES[month2.month]} {month2.year}
                    </span>
                    <span className="font-bold text-sm text-gray-900 sm:hidden">
                      {MONTH_NAMES[month1.month]} {month1.year} - {MONTH_NAMES[month2.month]}
                    </span>
                  </div>
                  <button className="bg-transparent border-0 text-gray-900 cursor-pointer text-xl hover:bg-gray-100 p-2 rounded-full" onClick={nextMonth}>›</button>
                </div>

                <div className="flex gap-8 justify-center min-w-[500px]">
                  {/* First Month */}
                  <div className="flex-1">
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                      {DAY_LABELS.map((l) => (
                        <div key={l} className="text-[11px] font-bold text-gray-500 uppercase">{l}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {month1.days.map((day, i) => {
                        if (!day) return <div key={`e${i}`} className="aspect-square" />;
                        const isPast = day < today;
                        const booked = isDateBooked(day, bookedDates);
                        const isStart = startDate && isSameDay(day, startDate);
                        const isEnd = endDate && isSameDay(day, endDate);
                        const inRange = isInRange(day, startDate, endDate);
                        return (
                          <div
                            key={day.toISOString()}
                            className={`aspect-square flex items-center justify-center rounded-full text-xs font-semibold cursor-pointer transition-all ${isPast ? "text-gray-300 cursor-not-allowed line-through" : ""
                              } ${booked ? "bg-red-50 text-red-500 cursor-not-allowed line-through" : ""
                              } ${isStart || isEnd ? "bg-gray-900 text-white font-bold" : ""
                              } ${inRange ? "bg-gray-100 text-gray-900 rounded-none" : ""
                              } ${!isPast && !booked && !isStart && !isEnd && !inRange ? "hover:bg-gray-100 text-gray-900" : ""
                              }`}
                            onClick={() => !isPast && !booked && handleDayClick(day)}
                          >
                            {day.getDate()}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Second Month */}
                  <div className="flex-1">
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                      {DAY_LABELS.map((l) => (
                        <div key={l} className="text-[11px] font-bold text-gray-500 uppercase">{l}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {month2.days.map((day, i) => {
                        if (!day) return <div key={`e${i}`} className="aspect-square" />;
                        const isPast = day < today;
                        const booked = isDateBooked(day, bookedDates);
                        const isStart = startDate && isSameDay(day, startDate);
                        const isEnd = endDate && isSameDay(day, endDate);
                        const inRange = isInRange(day, startDate, endDate);
                        return (
                          <div
                            key={day.toISOString()}
                            className={`aspect-square flex items-center justify-center rounded-full text-xs font-semibold cursor-pointer transition-all ${isPast ? "text-gray-300 cursor-not-allowed line-through" : ""
                              } ${booked ? "bg-red-50 text-red-500 cursor-not-allowed line-through" : ""
                              } ${isStart || isEnd ? "bg-gray-900 text-white font-bold" : ""
                              } ${inRange ? "bg-gray-100 text-gray-900 rounded-none" : ""
                              } ${!isPast && !booked && !isStart && !isEnd && !inRange ? "hover:bg-gray-100 text-gray-900" : ""
                              }`}
                            onClick={() => !isPast && !booked && handleDayClick(day)}
                          >
                            {day.getDate()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <p className="text-gray-500 text-xs mt-4 text-center">
                  {!startDate ? "Click a date to set pick-up" :
                    !endDate ? "Click a second date to set return" :
                      `${startDate.toLocaleDateString()} → ${endDate.toLocaleDateString()}`}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Airbnb Sticky Reservation Card */}
          <div>
            <div className="sticky top-28 bg-white border border-gray-200 rounded-3xl p-7 shadow-xl">
              <div className="flex items-baseline gap-1 text-2xl font-extrabold text-gray-900">
                <span>${car?.pricePerDay}</span>
                <span className="text-sm font-normal text-gray-500"> / day</span>
              </div>

              {/* Date Box Input */}
              <div className="grid grid-cols-2 border border-gray-300 rounded-xl my-5 overflow-hidden bg-white">
                <div className="p-3 border-r border-gray-300">
                  <label className="block text-[10px] font-extrabold text-gray-900 uppercase tracking-wider">PICK-UP</label>
                  <div className="text-xs font-medium text-gray-600 mt-0.5">{startDate ? startDate.toLocaleDateString("en-GB") : "Add date"}</div>
                </div>
                <div className="p-3">
                  <label className="block text-[10px] font-extrabold text-gray-900 uppercase tracking-wider">RETURN</label>
                  <div className="text-xs font-medium text-gray-600 mt-0.5">{endDate ? endDate.toLocaleDateString("en-GB") : "Add date"}</div>
                </div>
              </div>

              {/* Reserve CTA */}
              {error && <p className="text-red-600 text-xs mb-2">{error}</p>}

              <button
                className="w-full py-3.5 px-6 rounded-xl text-base font-bold cursor-pointer border-0 bg-brand-primary hover:bg-brand-hover text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmit}
                disabled={!startDate || !endDate || submitting}
              >
                {submitting ? "Reserving…" : "Reserve Vehicle"}
              </button>

              <p className="text-gray-500 text-center text-xs mt-3">
                You won't be charged until KHQR payment page
              </p>

              {/* Pricing Breakdown */}
              {totalPrice > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center py-2 text-sm text-gray-600">
                    <span>${car?.pricePerDay} x {totalDays} days</span>
                    <span className="font-semibold text-gray-900">${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 text-sm text-gray-600">
                    <span>Standard insurance & fee</span>
                    <span className="font-semibold text-gray-900">${serviceFee.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-gray-200 my-3" />
                  <div className="flex justify-between items-center py-1 text-base font-bold text-gray-900">
                    <span>Total before taxes</span>
                    <span className="text-lg font-extrabold">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 p-12 text-center text-gray-500">Loading vehicle listing...</div>}>
      <BookingContent />
    </Suspense>
  );
}

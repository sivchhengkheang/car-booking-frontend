"use client";
import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { ArrowLeft, ArrowRight, Timer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  getCar,
  getCarBookedDates,
  createBooking,
  getCarPhotoUrl,
  getMyBookings,
  cancelBooking,
} from "@/lib/api";
import { useBasket } from "@/context/BasketContext";

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
  "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80",
];

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("kid_access_token");
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function isInRange(day, start, end) {
  if (!day || !start || !end) return false;
  const d = new Date(day); d.setHours(0, 0, 0, 0);
  const s = new Date(start); s.setHours(0, 0, 0, 0);
  const e = new Date(end); e.setHours(0, 0, 0, 0);
  return d > s && d < e;
}

function isDatePast(day, today) {
  if (!day) return false;
  const d = new Date(day); d.setHours(0, 0, 0, 0);
  const t = new Date(today); t.setHours(0, 0, 0, 0);
  return d < t;
}

function isDateBooked(day, bookedDates) {
  if (!day || !bookedDates || bookedDates.length === 0) return false;
  const target = new Date(day);
  target.setHours(12, 0, 0, 0);
  return bookedDates.some((b) => {
    const s = new Date(b.start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(b.end);
    e.setHours(23, 59, 59, 999);
    return target >= s && target <= e;
  });
}

function formatDateDisplay(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function toDateInputValue(date) {
  if (!date || isNaN(new Date(date).getTime())) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeDisplay(timeStr) {
  if (!timeStr) return "10:00 AM";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const TIME_OPTIONS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
  "19:00", "20:00", "21:00", "22:00"
];

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const carId = searchParams.get("carId");

  const { addToBasket, toggleWishlist, isWishlisted, showToast } = useBasket();

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(carId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(() => (!carId ? "No vehicle selected" : null));
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);


  // Calendar state
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // Dates directly completed and synchronized
  const [startDate, setStartDate] = useState(() => {
    const qStart = searchParams?.get("startDate");
    if (qStart) {
      const d = new Date(qStart);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  });
  const [endDate, setEndDate] = useState(() => {
    const qEnd = searchParams?.get("endDate");
    if (qEnd) {
      const d = new Date(qEnd);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  });
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnTime, setReturnTime] = useState("10:00");
  const [bookedDates, setBookedDates] = useState([]);
  const [activeUserHold, setActiveUserHold] = useState(null);
  const [holdSecondsRemaining, setHoldSecondsRemaining] = useState(0);
  const [cancellingHold, setCancellingHold] = useState(false);

  useEffect(() => {
    if (!carId) return;

    const token = getToken();
    const fetchPromises = [getCar(carId), getCarBookedDates(carId)];
    if (token) {
      fetchPromises.push(getMyBookings(token).catch(() => ({ success: false })));
    }

    Promise.all(fetchPromises)
      .then(([carData, bookingsData, myBookingsData]) => {
        if (carData.success) setCar(carData.car || carData.data);
        else setError("Car not found");

        let userHold = null;
        if (myBookingsData && myBookingsData.success && Array.isArray(myBookingsData.bookings)) {
          const nowTime = Date.now();
          const match = myBookingsData.bookings.find(
            (b) =>
              (b.car?._id === carId || b.car === carId) &&
              (b.status === "PENDING_PAYMENT" || b.status === "PROVISIONAL") &&
              new Date(b.holdExpiresAt).getTime() > nowTime
          );
          if (match) {
            userHold = match;
            setActiveUserHold(match);
            const remaining = Math.max(
              0,
              Math.floor((new Date(match.holdExpiresAt).getTime() - nowTime) / 1000)
            );
            setHoldSecondsRemaining(remaining);
          }
        }

        if (bookingsData.success && Array.isArray(bookingsData.bookedDates)) {
          // Exclude current user's own active hold from booked ranges so calendar doesn't block them
          const filtered = bookingsData.bookedDates.filter((b) => {
            if (userHold && userHold._id && b._id === userHold._id) return false;
            if (
              userHold &&
              new Date(b.startDate).getTime() === new Date(userHold.startDate).getTime() &&
              new Date(b.endDate).getTime() === new Date(userHold.endDate).getTime()
            ) {
              return false;
            }
            return true;
          });

          setBookedDates(
            filtered.map((b) => ({
              start: new Date(b.startDate),
              end: new Date(b.endDate),
            }))
          );
        }
      })
      .catch(() => setError("Could not connect. Please try again."))
      .finally(() => setLoading(false));
  }, [carId]);

  // Live countdown ticker for the active reservation hold
  useEffect(() => {
    if (!activeUserHold || holdSecondsRemaining <= 0) return;
    const ticker = setInterval(() => {
      setHoldSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(ticker);
          setActiveUserHold(null);
          // Refresh booked dates when hold expires
          if (carId) {
            getCarBookedDates(carId).then((res) => {
              if (res.success && Array.isArray(res.bookedDates)) {
                setBookedDates(
                  res.bookedDates.map((b) => ({
                    start: new Date(b.startDate),
                    end: new Date(b.endDate),
                  }))
                );
              }
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [activeUserHold, holdSecondsRemaining, carId]);

  // Handle instant cancellation and release of reservation hold
  const handleCancelHold = async () => {
    if (!activeUserHold) return;
    const token = getToken();
    setCancellingHold(true);
    try {
      const res = await cancelBooking(
        activeUserHold._id,
        "Customer released hold from car booking page",
        token
      );
      if (res.success) {
        setActiveUserHold(null);
        setHoldSecondsRemaining(0);
        if (showToast) {
          showToast("Reservation hold released. You can now select new dates.", "success");
        }
        // Refresh booked dates immediately
        const fresh = await getCarBookedDates(carId);
        if (fresh.success && Array.isArray(fresh.bookedDates)) {
          setBookedDates(
            fresh.bookedDates.map((b) => ({
              start: new Date(b.startDate),
              end: new Date(b.endDate),
            }))
          );
        }
      }
    } catch (err) {
      console.error("Cancel hold error:", err);
    } finally {
      setCancellingHold(false);
    }
  };

  const buildDaysForMonth = useCallback(
    (offsetMonth = 0) => {
      const targetDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offsetMonth, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const first = new Date(year, month, 1).getDay();
      const total = new Date(year, month + 1, 0).getDate();
      const days = [];
      for (let i = 0; i < first; i++) days.push(null);
      for (let d = 1; d <= total; d++) days.push(new Date(year, month, d));
      return { days, year, month };
    },
    [viewDate]
  );

  function handleDayClick(day) {
    if (!day || isDatePast(day, today) || isDateBooked(day, bookedDates)) return;

    if (!startDate || (startDate && endDate)) {
      // First click: sets pick-up date
      const s = new Date(day);
      const [h, m] = pickupTime.split(":").map(Number);
      s.setHours(h, m, 0, 0);
      setStartDate(s);
      setEndDate(null);
    } else {
      // Second click: sets return date
      const checkStart = new Date(startDate);
      checkStart.setHours(0, 0, 0, 0);
      const checkDay = new Date(day);
      checkDay.setHours(0, 0, 0, 0);

      if (checkDay < checkStart) {
        // Earlier than pick-up date -> change pick-up to this day
        const s = new Date(day);
        const [h, m] = pickupTime.split(":").map(Number);
        s.setHours(h, m, 0, 0);
        setStartDate(s);
        setEndDate(null);
      } else {
        // Ensure no booked dates fall inside the range
        let hasOverlap = false;
        let current = new Date(checkStart);
        while (current <= checkDay) {
          if (isDateBooked(current, bookedDates)) {
            hasOverlap = true;
            break;
          }
          current.setDate(current.getDate() + 1);
        }

        if (hasOverlap) {
          setError("Those dates include days already booked. Please pick different dates.");
          setTimeout(() => setError(null), 3500);
          const s = new Date(day);
          const [h, m] = pickupTime.split(":").map(Number);
          s.setHours(h, m, 0, 0);
          setStartDate(s);
          setEndDate(null);
        } else {
          const e = new Date(day);
          const [h, m] = returnTime.split(":").map(Number);
          e.setHours(h, m, 0, 0);
          // If customer picks same day or return is earlier than pickup, advance by 24h (1-day rental)
          if (e <= startDate) {
            e.setDate(e.getDate() + 1);
          }
          setEndDate(e);
        }
      }
    }
  }

  const handlePickupTimeChange = (newTime) => {
    setPickupTime(newTime);
    if (startDate) {
      const s = new Date(startDate);
      const [h, m] = newTime.split(":").map(Number);
      s.setHours(h, m, 0, 0);
      setStartDate(s);
      if (endDate && endDate <= s) {
        const nextDay = new Date(s);
        nextDay.setDate(nextDay.getDate() + 1);
        setEndDate(nextDay);
      }
    }
  };

  const handleReturnTimeChange = (newTime) => {
    setReturnTime(newTime);
    if (endDate) {
      const e = new Date(endDate);
      const [h, m] = newTime.split(":").map(Number);
      e.setHours(h, m, 0, 0);
      if (startDate && e <= startDate) {
        e.setDate(e.getDate() + 1);
      }
      setEndDate(e);
    }
  };

  const isCurrentMonth = useMemo(() => {
    return (
      viewDate.getFullYear() === today.getFullYear() &&
      viewDate.getMonth() === today.getMonth()
    );
  }, [viewDate, today]);

  function prevMonth() {
    if (isCurrentMonth) return;
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  }

  const handlePickupDateInput = (dateStr) => {
    if (!dateStr) {
      setStartDate(null);
      setEndDate(null);
      return;
    }
    const [y, m, d] = dateStr.split("-").map(Number);
    const chosen = new Date(y, m - 1, d);
    chosen.setHours(0, 0, 0, 0);

    if (isDatePast(chosen, today)) {
      setError("Pick-up date cannot be in the past.");
      setTimeout(() => setError(null), 3500);
      return;
    }

    if (isDateBooked(chosen, bookedDates)) {
      setError("Selected pick-up date is already booked. Please choose an available date.");
      setTimeout(() => setError(null), 3500);
      return;
    }

    const s = new Date(chosen);
    const [h, min] = pickupTime.split(":").map(Number);
    s.setHours(h, min, 0, 0);
    setStartDate(s);

    if (endDate) {
      const checkEnd = new Date(endDate);
      checkEnd.setHours(0, 0, 0, 0);
      if (checkEnd <= chosen) {
        setEndDate(null);
      } else {
        let hasOverlap = false;
        let cur = new Date(chosen);
        while (cur <= checkEnd) {
          if (isDateBooked(cur, bookedDates)) {
            hasOverlap = true;
            break;
          }
          cur.setDate(cur.getDate() + 1);
        }
        if (hasOverlap) {
          setEndDate(null);
        }
      }
    }

    setViewDate(new Date(chosen.getFullYear(), chosen.getMonth(), 1));
  };

  const handleReturnDateInput = (dateStr) => {
    if (!dateStr) {
      setEndDate(null);
      return;
    }
    const [y, m, d] = dateStr.split("-").map(Number);
    const chosen = new Date(y, m - 1, d);
    chosen.setHours(0, 0, 0, 0);

    const baseStart = startDate ? new Date(startDate) : new Date(today);
    baseStart.setHours(0, 0, 0, 0);

    if (!startDate) {
      const s = new Date(baseStart);
      const [h, min] = pickupTime.split(":").map(Number);
      s.setHours(h, min, 0, 0);
      setStartDate(s);
    }

    if (chosen <= baseStart) {
      setError("Return date must be after pick-up date.");
      setTimeout(() => setError(null), 3500);
      return;
    }

    let hasOverlap = false;
    let cur = new Date(baseStart);
    while (cur <= chosen) {
      if (isDateBooked(cur, bookedDates)) {
        hasOverlap = true;
        break;
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (hasOverlap) {
      setError("Those dates include days already booked. Please pick a different return date.");
      setTimeout(() => setError(null), 3500);
      return;
    }

    const e = new Date(chosen);
    const [h, min] = returnTime.split(":").map(Number);
    e.setHours(h, min, 0, 0);
    setEndDate(e);

    const currentViewYear = viewDate.getFullYear();
    const currentViewMonth = viewDate.getMonth();
    const chosenYear = chosen.getFullYear();
    const chosenMonth = chosen.getMonth();
    const monthDiff = (chosenYear - currentViewYear) * 12 + (chosenMonth - currentViewMonth);
    if (monthDiff > 1) {
      setViewDate(new Date(chosenYear, chosenMonth - 1, 1));
    }
  };

  const handleAddDuration = (days) => {
    let base = startDate ? new Date(startDate) : new Date(today);
    base.setHours(0, 0, 0, 0);

    if (!startDate) {
      let curStart = new Date(base);
      while (isDateBooked(curStart, bookedDates)) {
        curStart.setDate(curStart.getDate() + 1);
      }
      base = curStart;
      const s = new Date(base);
      const [h, min] = pickupTime.split(":").map(Number);
      s.setHours(h, min, 0, 0);
      setStartDate(s);
    }

    const target = new Date(base);
    target.setDate(target.getDate() + days);

    let hasOverlap = false;
    let cur = new Date(base);
    while (cur <= target) {
      if (isDateBooked(cur, bookedDates)) {
        hasOverlap = true;
        break;
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (hasOverlap) {
      setError("Selected duration includes already booked dates. Please pick different dates.");
      setTimeout(() => setError(null), 3500);
      return;
    }

    const e = new Date(target);
    const [h, min] = returnTime.split(":").map(Number);
    e.setHours(h, min, 0, 0);
    setEndDate(e);

    const currentViewYear = viewDate.getFullYear();
    const currentViewMonth = viewDate.getMonth();
    const targetYear = target.getFullYear();
    const targetMonth = target.getMonth();
    const monthDiff = (targetYear - currentViewYear) * 12 + (targetMonth - currentViewMonth);
    if (monthDiff > 1) {
      setViewDate(new Date(targetYear, targetMonth - 1, 1));
    }
  };

  // 100% matched with MongoDB Booking.totalDays: Math.max(1, Math.ceil(diffTime / 24h))
  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return 0;
    const diffTime = Math.abs(end - start);
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [startDate, endDate]);

  const pricePerDay = Number(car?.pricePerDay) || 35;
  const carRentalTotal = totalDays > 0 ? pricePerDay * totalDays : 0;
  // Database Booking.totalPrice strictly equals carRentalTotal (totalDays * pricePerDay)
  const grandTotal = carRentalTotal;

  const handleAddToBasket = () => {
    if (!startDate || !endDate) {
      setError("Please pick your dates on the calendar first.");
      document.getElementById("rental-calendar")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError("Return date and time must be after pick-up date and time.");
      return;
    }
    addToBasket({
      car,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  };

  async function handleBookNow() {
    if (!startDate || !endDate) {
      setError("Please pick a start and return date first.");
      document.getElementById("rental-calendar")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError("Return date and time must be after pick-up date and time.");
      return;
    }
    const token = getToken();
    if (!token) {
      // Put in basket and redirect to login
      handleAddToBasket();
      router.push(`/auth/login?redirect=/booking/checkout?carId=${carId}`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const data = await createBooking(
        {
          carId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        token
      );
      if (data.success && data.booking) {
        router.push(`/booking/checkout?bookingId=${data.booking._id}`);
      } else {
        setError(data.message || "Failed to reserve car. Please try again.");
      }
    } catch (err) {
      setError(err?.message || "Could not connect to reserve vehicle. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const gallery = useMemo(() => {
    if (car?.photos && Array.isArray(car.photos) && car.photos.length > 0) {
      return car.photos.map((p, idx) => getCarPhotoUrl(p, idx));
    }
    return SAMPLE_GALLERY_PHOTOS;
  }, [car]);

  const month1 = buildDaysForMonth(0);
  const month2 = buildDaysForMonth(1);

  if (loading) {
    return (
      <div className="text-center py-32">
        <div className="w-9 h-9 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spinner mx-auto mb-4" />
        <p className="text-sm font-semibold text-slate-500">Loading car details…</p>
      </div>
    );
  }

  const brand = car?.brand || car?.make || "Toyota";
  const model = car?.modelName || car?.model || "Camry";
  const city = car?.location?.city || "Phnom Penh";
  const fullAddress = car?.location ? [car.location.address, car.location.city].filter(Boolean).join(', ') : "Phnom Penh, Cambodia";
  const wishlisted = isWishlisted(car?._id || carId);

  const currentPhoto = gallery[selectedPhotoIndex % gallery.length];

  const handleNextPhoto = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedPhotoIndex((prev) => (prev + 1) % gallery.length);
  };

  const handlePrevPhoto = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedPhotoIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  return (
    <>
      <Navbar />

      <div className="mb-4 left-15 fixed top-28 left-16">
        {/* Back to Home Button */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
        >
          <ArrowLeft
            size={18}
            strokeWidth={2.5}
            className="transition-transform group-hover:-translate-x-0.5"
          />
          Back
        </button>
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 py-8 relative ">


        {/* 1. Hero & Media Section (Top of Page) */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm text-slate-500">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold text-xs uppercase tracking-wider">
                  {car?.category || "Sedan"}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 font-semibold">📍 {city}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {car?.year || 2024} {brand} {model} <span className="text-slate-400 font-medium">{car?.trim || ""}</span>
              </h1>

              <div className="flex items-center gap-3 text-sm text-slate-600 mt-3 font-medium">
                <span className="flex items-center gap-1"><span className="text-amber-500 font-bold">★</span> 4.9 (42 trips)</span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-xs font-bold">
                  ✓ Trusted Host
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">Free cancel up to 24h before</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(window.location.href);
                    showToast("Listing link copied!");
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
              >
                <span>🔗</span> Share
              </button>
              <button
                type="button"
                onClick={() => toggleWishlist(car)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
              >
                <span>{wishlisted ? "❤️" : "🤍"}</span> {wishlisted ? "Saved" : "Save"}
              </button>
            </div>
          </div>

          {/* Photo Gallery Grid (Airbnb/Turo style) - 1 Large + 4 Small */}
          <div className="rounded-3xl overflow-hidden relative group h-[350px] md:h-[480px]">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-2 h-full">
              {/* Main large image */}
              <div className="relative h-full row-span-2 cursor-pointer overflow-hidden group/main">
                <img
                  src={gallery[0] || SAMPLE_GALLERY_PHOTOS[0]}
                  alt={`${brand} ${model} main view`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/main:scale-105"
                  onError={(e) => { e.target.src = SAMPLE_GALLERY_PHOTOS[0]; }}
                  onClick={() => setSelectedPhotoIndex(0)}
                />
              </div>

              {/* Grid of 4 smaller images */}
              {[1, 2, 3, 4].map((idx) => {
                const photo = gallery[idx] || SAMPLE_GALLERY_PHOTOS[idx % SAMPLE_GALLERY_PHOTOS.length];
                return (
                  <div key={idx} className="hidden md:block relative h-full w-full cursor-pointer overflow-hidden group/item">
                    <img
                      src={photo}
                      alt={`${brand} ${model} view ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                      onError={(e) => { e.target.src = SAMPLE_GALLERY_PHOTOS[idx % SAMPLE_GALLERY_PHOTOS.length]; }}
                      onClick={() => setSelectedPhotoIndex(idx)}
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors pointer-events-none" />
                  </div>
                );
              })}
            </div>

            <button
              className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold text-slate-900 shadow-md border border-slate-200 hover:bg-white flex items-center gap-2 transition-all cursor-pointer hover:scale-105"
              onClick={() => {
                setSelectedPhotoIndex((prev) => (prev + 1) % gallery.length);
              }}
            >
              <span>📷</span> View all {gallery.length} photos
            </button>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 items-start">

          {/* Left Column Content */}
          <div className="space-y-10">

            {/* 2. Core Specifications Bar */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Car Details</h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-2xl mb-1">🕹️</span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Transmission</span>
                  <span className="text-xs font-bold text-slate-900">{car?.transmission || "Automatic"}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-2xl mb-1">💺</span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Seats</span>
                  <span className="text-xs font-bold text-slate-900">{car?.seats || 5} Passengers</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-2xl mb-1">⛽</span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Fuel</span>
                  <span className="text-xs font-bold text-slate-900">{car?.fuelType || "Gasoline"}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-2xl mb-1">🧳</span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Luggage</span>
                  <span className="text-xs font-bold text-slate-900">2 Large + 2 Bags</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-2xl mb-1">🛣️</span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Mileage</span>
                  <span className="text-xs font-bold text-slate-900">Unlimited</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-2xl mb-1">🚪</span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Doors</span>
                  <span className="text-xs font-bold text-slate-900">4-Door</span>
                </div>
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Description */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">About this car</h2>
              <p className="text-slate-600 leading-relaxed">
                {car?.description || `This ${brand} ${model} is clean, checked, and ready to go. Good for city trips, long drives, or visiting temples. We clean and check the car before every rental.`}
              </p>
            </div>

            <hr className="border-slate-200" />

            {/* 3. Features & Amenities Checklist */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">What&apos;s included</h2>
              {car?.features?.length > 0 ? (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  {car.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-emerald-500 mt-0.5 text-base">✓</span>
                      <span className="mt-0.5">{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">📱 Tech & Audio</h3>
                    <ul className="space-y-2.5">
                      <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-emerald-500 mt-0.5">✓</span> Apple CarPlay / Android Auto</li>
                      <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-emerald-500 mt-0.5">✓</span> Bluetooth & USB-C fast charging</li>
                      <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-emerald-500 mt-0.5">✓</span> Touchscreen display</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">🛡️ Safety & Assist</h3>
                    <ul className="space-y-2.5">
                      <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-emerald-500 mt-0.5">✓</span> Backup camera</li>
                      <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-emerald-500 mt-0.5">✓</span> Blind-spot monitoring</li>
                      <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-emerald-500 mt-0.5">✓</span> Cruise control</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">❄️ Comfort & Climate</h3>
                    <ul className="space-y-2.5">
                      <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-emerald-500 mt-0.5">✓</span> Dual-zone climate control</li>
                      <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-emerald-500 mt-0.5">✓</span> Leather seats</li>
                      <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-emerald-500 mt-0.5">✓</span> Tinted windows</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">🏔️ Performance</h3>
                    <ul className="space-y-2.5">
                      <li className="flex items-start gap-2 text-sm text-slate-700"><span className="text-emerald-500 mt-0.5">✓</span> All-Wheel Drive (AWD)</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <hr className="border-slate-200" />

            {/* 4. Vehicle Rules & Rental Guidelines */}
            {/* <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Rental Guidelines</h2>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex gap-3">
                    <div className="text-xl">🪪</div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Minimum Driver Age</h4>
                      <p className="text-xs text-slate-600 mt-0.5">21+ years old (Valid national ID or IDP required).</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="text-xl">⛽</div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Fuel Policy</h4>
                      <p className="text-xs text-slate-600 mt-0.5">Full-to-Full (return car with same level as pickup).</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="text-xl text-red-500">🚭</div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">No Smoking / Vaping</h4>
                      <p className="text-xs text-slate-600 mt-0.5">Strictly prohibited. $150 deep-cleaning penalty fee applies.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="text-xl">🐾</div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Pets Policy</h4>
                      <p className="text-xs text-slate-600 mt-0.5">Pet-Friendly, but carrier requirement is strictly enforced.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div> */}

            {/* 4. Availability & Rental Dates Calendar */}
            <div id="rental-calendar" className="scroll-mt-28">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Pick Your Dates</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Tap a start date, then a return date. Red dates are already taken.
                  </p>
                </div>
                {/* Availability Legend */}
                <div className="flex items-center gap-3 text-xs font-semibold bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs"></span>
                    <span className="text-slate-700">Open</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-xs"></span>
                    <span className="text-slate-700">Taken</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-xs"></span>
                    <span className="text-slate-700">Selected</span>
                  </div>
                </div>
              </div>

              {/* Calendar Container */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
                {/* 2 Separate Date Divs (Styled like Pick-up Time & Reference Design) */}
                <div className="mb-5 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Separate Div 1: Pick-up Date */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Pick-up Date
                      </label>
                      <div className="relative flex items-center gap-2.5 bg-white border border-slate-200 hover:border-blue-500 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 rounded-xl px-3 py-2 transition-all cursor-pointer shadow-2xs group">
                        <svg
                          className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.8}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className={`text-xs sm:text-sm font-semibold truncate ${startDate ? "text-slate-900 font-bold" : "text-slate-400 font-normal"}`}>
                          {startDate ? formatDateDisplay(startDate) : "Select date"}
                        </span>
                        <input
                          type="date"
                          value={toDateInputValue(startDate)}
                          min={toDateInputValue(today)}
                          onChange={(e) => handlePickupDateInput(e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                          title="Click to select pick-up date"
                          aria-label="Pick-up Date"
                        />
                      </div>
                    </div>

                    {/* Separate Div 2: Return Date */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Return Date
                      </label>
                      <div className="relative flex items-center gap-2.5 bg-white border border-slate-200 hover:border-blue-500 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 rounded-xl px-3 py-2 transition-all cursor-pointer shadow-2xs group">
                        <svg
                          className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.8}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className={`text-xs sm:text-sm font-semibold truncate ${endDate ? "text-slate-900 font-bold" : "text-slate-400 font-normal"}`}>
                          {endDate ? formatDateDisplay(endDate) : "Select date"}
                        </span>
                        <input
                          type="date"
                          value={toDateInputValue(endDate)}
                          min={toDateInputValue(startDate || today)}
                          onChange={(e) => handleReturnDateInput(e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                          title="Click to select return date"
                          aria-label="Return Date"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick duration presets */}
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60 overflow-x-auto text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">Quick:</span>
                    <button
                      type="button"
                      onClick={() => handleAddDuration(7)}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-600 font-semibold text-xs transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                      title="Set rental to 1 week"
                    >
                      +1 Wk
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddDuration(14)}
                      className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-600 font-semibold text-xs transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                      title="Set rental to 2 weeks"
                    >
                      +2 Wks
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddDuration(30)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white font-bold text-xs transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                      title="Set rental to 1 month (30 days)"
                    >
                      +1 Month
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddDuration(60)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white font-bold text-xs transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                      title="Set rental to 2 months (60 days)"
                    >
                      +2 Months
                    </button>
                  </div>
                </div>

                {/* Navigation Header */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    type="button"
                    onClick={prevMonth}
                    disabled={isCurrentMonth}
                    className="p-2 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center w-9 h-9"
                    title="Previous month"
                  >
                    ‹
                  </button>
                  <span className="text-sm font-extrabold text-slate-900 tracking-wide uppercase sm:hidden">
                    {MONTH_NAMES[month1.month]} {month1.year}
                  </span>
                  <div className="hidden sm:flex items-center gap-16 font-bold text-sm text-slate-800">
                    <span>{MONTH_NAMES[month1.month]} {month1.year}</span>
                    <span>{MONTH_NAMES[month2.month]} {month2.year}</span>
                  </div>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-2 rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center w-9 h-9"
                    title="Next month"
                  >
                    ›
                  </button>
                </div>

                {/* 1 or 2 Months Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {[month1, month2].map((m, mIdx) => (
                    <div key={`m-${m.year}-${m.month}`} className={`${mIdx === 1 ? 'hidden md:block' : ''}`}>
                      <div className="hidden sm:block md:hidden text-center font-bold text-sm text-slate-900 mb-3">
                        {MONTH_NAMES[m.month]} {m.year}
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {DAY_LABELS.map((label) => (
                          <div key={label} className="text-[11px] font-bold text-slate-400 uppercase py-1">
                            {label}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {m.days.map((day, idx) => {
                          if (!day) return <div key={`empty-${mIdx}-${idx}`} className="aspect-square" />;

                          const isPast = isDatePast(day, today);
                          const isBooked = isDateBooked(day, bookedDates);
                          const isStart = startDate && isSameDay(day, startDate);
                          const isEnd = endDate && isSameDay(day, endDate);
                          const inRange = isInRange(day, startDate, endDate);
                          const isUnavailable = isPast || isBooked;

                          let dayClass = "text-slate-800 hover:bg-blue-50 hover:text-blue-600 font-semibold cursor-pointer border border-transparent";
                          if (isPast) {
                            dayClass = "text-slate-300 line-through cursor-not-allowed";
                          } else if (isBooked) {
                            dayClass = "bg-rose-50 text-rose-400 line-through cursor-not-allowed border border-rose-200/60 font-medium";
                          } else if (isStart || isEnd) {
                            dayClass = "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30 scale-105 z-10";
                          } else if (inRange) {
                            dayClass = "bg-blue-100 text-blue-900 font-semibold rounded-none";
                          }

                          return (
                            <button
                              type="button"
                              key={day.toISOString()}
                              disabled={isUnavailable}
                              title={
                                isBooked
                                  ? "Already booked"
                                  : isPast
                                    ? "Past date"
                                    : isStart
                                      ? "Start date"
                                      : isEnd
                                        ? "Return date"
                                        : "Available"
                              }
                              onClick={() => handleDayClick(day)}
                              className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs transition-all relative ${dayClass}`}
                            >
                              <span>{day.getDate()}</span>
                              {isBooked && (
                                <span className="w-1 h-1 bg-rose-500 rounded-full mt-0.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selection helper status banner */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs">
                    {!startDate ? (
                      <span className="text-slate-600 font-medium">
                        👉 <span className="font-bold text-slate-900">Step 1:</span> Click any available date to set your <strong className="text-blue-600">Pick-up date</strong>.
                      </span>
                    ) : !endDate ? (
                      <span className="text-slate-600 font-medium">
                        👉 <span className="font-bold text-slate-900">Step 2:</span> Pick-up set for <strong className="text-blue-600">{formatDateDisplay(startDate)}</strong>. Now click your <strong className="text-blue-600">Return date</strong>.
                      </span>
                    ) : (
                      <span className="text-slate-700 font-medium flex items-center gap-1.5 flex-wrap">
                        <span className="text-emerald-600 font-bold">✓ Selected:</span>
                        <strong className="text-slate-900">{formatDateDisplay(startDate)}</strong>
                        <span className="text-slate-400">→</span>
                        <strong className="text-slate-900">{formatDateDisplay(endDate)}</strong>
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[11px] font-bold">
                          {totalDays} {totalDays === 1 ? "day" : "days"}
                        </span>
                      </span>
                    )}
                  </div>
                  {startDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate(null);
                        setEndDate(null);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer underline decoration-slate-300 self-end sm:self-auto"
                    >
                      Clear dates
                    </button>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* 5. Pickup & Return Location Info */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Where to pick up</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-100 rounded-2xl h-[250px] border border-slate-200 overflow-hidden relative shadow-inner grid-cols-2">
                  <iframe
                    title="Car Location Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight="0"
                    marginWidth="0"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                    className="absolute inset-0"
                  />
                </div>
                <div className="flex flex-col justify-center space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><span className="text-slate-400">📍</span> Location Address</h3>
                    <p className="text-sm text-slate-600 mt-1 ml-6">{fullAddress}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><span className="text-slate-400">🚚</span> Pick-up & Delivery</h3>
                    <ul className="text-sm text-slate-600 mt-1 ml-6 space-y-1">
                      <li className="flex justify-between"><span>Depot / Location pick-up</span> <span className="font-bold text-emerald-600">Free</span></li>
                      <li className="flex justify-between"><span>Airport & Hotel handover</span> <span className="font-semibold text-slate-700">Available</span></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* 6. Host & Fleet Manager Profile */}
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Your host</h2>
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-md shrink-0">
                  {car?.host?.name ? car.host.name.charAt(0) : "C"}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    {car?.host?.name || "Cambodia Premier Drive Fleet"}
                    <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wide">🏆 Top Host</span>
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Member since 2022 · 142 trips done</p>
                  <div className="flex gap-4 mt-3">
                    <div>
                      <div className="text-xs text-slate-500">Response rate</div>
                      <div className="font-bold text-slate-900 text-sm">100%</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Response time</div>
                      <div className="font-bold text-slate-900 text-sm">Within 10 mins</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: 7. Sticky Booking Sidebar */}
          <div className="sticky top-28 w-full z-10">
            <div className="p-6 bg-white border border-slate-200/90 rounded-3xl shadow-xl shadow-slate-200/40">

              {/* Active Reservation Hold Banner */}
              {activeUserHold && holdSecondsRemaining > 0 && (
                <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span>Reservation in progress</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-800 bg-white/80 px-2 py-0.5 rounded-md border border-amber-200/70">
                      ⏱️ {Math.floor(holdSecondsRemaining / 60)}:{String(holdSecondsRemaining % 60).padStart(2, "0")}
                    </span>
                  </div>

                  <p className="text-xs text-amber-850/90 mb-3">
                    You have an active 15m hold on this car for{" "}
                    <strong className="text-amber-950">
                      {formatDateDisplay(new Date(activeUserHold.startDate))} – {formatDateDisplay(new Date(activeUserHold.endDate))}
                    </strong>.
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/booking/checkout?bookingId=${activeUserHold._id}`)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs hover:shadow transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Continue Checkout</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelHold}
                      disabled={cancellingHold}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-rose-50 border border-amber-200 hover:border-rose-300 text-rose-700 text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      title="Cancel this reservation and pick new dates"
                    >
                      {cancellingHold ? "Releasing…" : "Cancel Hold"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-end gap-2 mb-6">
                <span className="text-3xl font-black text-slate-900">${pricePerDay.toFixed(2)}</span>
                <span className="text-slate-500 font-medium mb-1">/ day</span>
              </div>

              {/* Pick-up & Return Date Box (Directly synchronized from Calendar) */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-2">
                  {/* Div 1: Pick-up Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Pick-up Date
                    </label>
                    <div className="relative flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-500 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 rounded-xl px-2.5 py-2 transition-all cursor-pointer shadow-2xs group">
                      <svg
                        className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className={`text-xs font-semibold truncate ${startDate ? "text-slate-900 font-bold" : "text-slate-400 font-normal"}`}>
                        {startDate ? formatDateDisplay(startDate) : "Select date"}
                      </span>
                      <input
                        type="date"
                        value={toDateInputValue(startDate)}
                        min={toDateInputValue(today)}
                        onChange={(e) => handlePickupDateInput(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                        title="Click to select pick-up date"
                        aria-label="Pick-up Date"
                      />
                    </div>
                  </div>

                  {/* Div 2: Return Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Return Date
                    </label>
                    <div className="relative flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-500 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 rounded-xl px-2.5 py-2 transition-all cursor-pointer shadow-2xs group">
                      <svg
                        className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className={`text-xs font-semibold truncate ${endDate ? "text-slate-900 font-bold" : "text-slate-400 font-normal"}`}>
                        {endDate ? formatDateDisplay(endDate) : "Select date"}
                      </span>
                      <input
                        type="date"
                        value={toDateInputValue(endDate)}
                        min={toDateInputValue(startDate || today)}
                        onChange={(e) => handleReturnDateInput(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                        title="Click to select return date"
                        aria-label="Return Date"
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Pick-up & Return Time Selector */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Pick-up Time
                    </label>
                    <select
                      value={pickupTime}
                      onChange={(e) => handlePickupTimeChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={`p-${t}`} value={t}>
                          {formatTimeDisplay(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Return Time
                    </label>
                    <select
                      value={returnTime}
                      onChange={(e) => handleReturnTimeChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={`r-${t}`} value={t}>
                          {formatTimeDisplay(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between px-1">
                  <span>
                    {!startDate || !endDate ? (
                      <button
                        type="button"
                        onClick={() => document.getElementById("rental-calendar")?.scrollIntoView({ behavior: "smooth" })}
                        className="text-blue-600 font-semibold hover:underline cursor-pointer"
                      >
                        👉 Select dates on calendar
                      </button>
                    ) : (
                      <span className="text-emerald-700 font-semibold">✓ {totalDays} {totalDays === 1 ? 'day' : 'days'} selected</span>
                    )}
                  </span>
                  {startDate && endDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate(null);
                        setEndDate(null);
                      }}
                      className="text-slate-400 hover:text-rose-600 transition-colors text-[10px] font-bold underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </p>
              </div>

              {error && <p className="text-xs text-red-600 font-bold mb-4 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}

              {/* Action Button */}
              <button
                onClick={handleBookNow}
                disabled={submitting}
                className={`w-full py-4 px-4 rounded-xl text-sm font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 mb-6 ${!startDate || !endDate
                    ? "bg-slate-700 hover:bg-slate-800"
                    : "bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 hover:shadow-lg"
                  }`}
              >
                {submitting
                  ? "Please wait…"
                  : !startDate || !endDate
                    ? "Pick dates to book"
                    : "Book this car"}
              </button>

              <p className="text-[11px] text-slate-500 text-center mb-6">
                No payment yet — just a reservation.
              </p>

              {/* Transparent Cost Breakdown */}
              <div className="space-y-3 text-sm">
                {totalDays > 0 ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>Car rent (${pricePerDay.toFixed(2)}/day × {totalDays} {totalDays === 1 ? 'day' : 'days'})</span>
                      <span className="font-semibold text-slate-900">${carRentalTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Insurance protection</span>
                      <span className="font-semibold text-emerald-600">Included</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Distance (250 km/day)</span>
                      <span className="font-semibold text-slate-800">Included</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>24/7 Road assistance</span>
                      <span className="font-semibold text-slate-800">Included</span>
                    </div>

                    <div className="h-px bg-slate-200 my-4" />

                    <div className="flex justify-between font-bold text-slate-900">
                      <span>Total</span>
                      <span className="text-lg text-blue-700 font-black">${grandTotal.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-3 px-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
                    Pick your dates to see the total price.
                  </div>
                )}

                <div className="flex justify-between text-xs text-slate-500 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span>Security deposit (returned after)</span>
                  <span className="font-semibold">$100.00</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight mt-1 px-1">
                  * We hold this deposit and return it after the car is checked back in.
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>
    </>
  );

}

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full p-24 text-center text-sm font-semibold text-slate-500">
          Loading car…
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}

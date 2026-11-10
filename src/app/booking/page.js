"use client";
import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import {
  ArrowRight,
  AlertCircle,
  Check,
  Share2,
  Heart,
  Camera,
  MapPin,
  Users,
  Fuel,
  Settings2,
  Gauge,
  ChevronLeft,
  ChevronRight,
  Star,
  RefreshCw,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Breadcrumb from "@/components/Breadcrumb";
import CalendarMonth from "@/components/CalendarMonth";
import BookingStepIndicator from "./_components/BookingStepIndicator";
import ActiveHoldBanner from "./_components/ActiveHoldBanner";
import PriceSummaryCard from "./_components/PriceSummaryCard";
import BookingPageSkeleton from "./_components/BookingPageSkeleton";
import {
  getCar,
  getCarBookedDates,
  createBooking,
  getCarPhotoUrl,
  getMyBookings,
  cancelBooking,
  extendBooking,
  refreshAuthToken,
} from "@/lib/api";
import { session } from "@/lib/kid-auth";
import { useBasket } from "@/context/BasketContext";
import { useSearch } from "@/context/SearchContext";

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

function isTokenError(msg) {
  return typeof msg === "string" && /token|expired|unauthorized|jwt|session/i.test(msg);
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
    const s = new Date(b.start || b.startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(b.end || b.endDate);
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

function parseTimeHoursMinutes(timeStr, defaultHour = 10, defaultMin = 0) {
  if (!timeStr || typeof timeStr !== "string" || timeStr.toLowerCase() === "anytime" || !timeStr.includes(":")) {
    return [defaultHour, defaultMin];
  }
  const [h, m] = timeStr.split(":").map(Number);
  return [isNaN(h) ? defaultHour : h, isNaN(m) ? defaultMin : m];
}

function formatTimeDisplay(timeStr) {
  if (!timeStr || timeStr.toLowerCase() === "anytime") return "Anytime";
  const [h, m] = parseTimeHoursMinutes(timeStr);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const TIME_OPTIONS = [
  "anytime",
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
  "19:00", "20:00", "21:00", "22:00"
];

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const carId = searchParams.get("carId");

  const { addToBasket, toggleWishlist, isWishlisted, showToast, refreshActiveHold } = useBasket();
  const {
    searchFilters: contextFilters,
    setDateRange: setContextDateRange,
    isHydrated,
  } = useSearch();

  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(carId));
  const [submitting, setSubmitting] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);
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
    const qStart = searchParams?.get("startDate") || searchParams?.get("start");
    if (qStart) {
      const d = new Date(qStart);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  });
  const [endDate, setEndDate] = useState(() => {
    const qEnd = searchParams?.get("endDate") || searchParams?.get("end");
    if (qEnd) {
      const d = new Date(qEnd);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  });
  const [pickupTime, setPickupTime] = useState("anytime");
  const [returnTime, setReturnTime] = useState("anytime");
  const [bookedDates, setBookedDates] = useState([]);
  const [activeUserHold, setActiveUserHold] = useState(null);
  const [holdSecondsRemaining, setHoldSecondsRemaining] = useState(0);
  const [cancellingHold, setCancellingHold] = useState(false);

  // Only pre-fill dates if explicitly provided in URL search params; otherwise default is empty pick
  useEffect(() => {
    const qStart = searchParams?.get("startDate") || searchParams?.get("start");
    const qEnd = searchParams?.get("endDate") || searchParams?.get("end");
    if (qStart) {
      const s = new Date(qStart);
      if (!isNaN(s.getTime())) {
        const [ph, pm] = parseTimeHoursMinutes(pickupTime, 10, 0);
        s.setHours(ph, pm, 0, 0);
        setStartDate(s);
        setViewDate(new Date(s.getFullYear(), s.getMonth(), 1));
      }
    }
    if (qEnd) {
      const e = new Date(qEnd);
      if (!isNaN(e.getTime())) {
        const [rh, rm] = parseTimeHoursMinutes(returnTime, 10, 0);
        e.setHours(rh, rm, 0, 0);
        setEndDate(e);
      }
    }
  }, [searchParams]);

  // Sync booking dates to SearchContext so Navbar reflects the dates
  useEffect(() => {
    if (!startDate && !endDate) {
      if (contextFilters?.startDate || contextFilters?.endDate) {
        setContextDateRange({ startDate: null, endDate: null });
      }
      return;
    }
    const currentStartMs = startDate ? new Date(startDate).getTime() : null;
    const currentEndMs = endDate ? new Date(endDate).getTime() : null;
    const ctxStartMs = contextFilters?.startDate ? new Date(contextFilters.startDate).getTime() : null;
    const ctxEndMs = contextFilters?.endDate ? new Date(contextFilters.endDate).getTime() : null;

    if (currentStartMs !== ctxStartMs || currentEndMs !== ctxEndMs) {
      setContextDateRange({ startDate, endDate });
    }
  }, [startDate, endDate, contextFilters?.startDate, contextFilters?.endDate, setContextDateRange]);

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

          const parsedBooked = filtered.map((b) => ({
            start: new Date(b.startDate),
            end: new Date(b.endDate),
          }));
          setBookedDates(parsedBooked);

          // Validate pre-selected dates against vehicle's booked schedule
          if (startDate && endDate) {
            let hasConflict = false;
            const cur = new Date(startDate);
            cur.setHours(0, 0, 0, 0);
            const endD = new Date(endDate);
            endD.setHours(0, 0, 0, 0);

            while (cur <= endD) {
              if (isDateBooked(cur, parsedBooked)) {
                hasConflict = true;
                break;
              }
              cur.setDate(cur.getDate() + 1);
            }

            if (hasConflict) {
              setError("Your selected search dates are already booked for this vehicle. Please pick available dates below.");
              setTimeout(() => setError(null), 5000);
              setStartDate(null);
              setEndDate(null);
            }
          }
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
        setStartDate(null);
        setEndDate(null);
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
    setError(null);

    if (!startDate || (startDate && endDate)) {
      // First click: sets pick-up date
      const s = new Date(day);
      const [h, m] = parseTimeHoursMinutes(pickupTime, 10, 0);
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
        const [h, m] = parseTimeHoursMinutes(pickupTime, 10, 0);
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
          const [h, m] = parseTimeHoursMinutes(pickupTime, 10, 0);
          s.setHours(h, m, 0, 0);
          setStartDate(s);
          setEndDate(null);
        } else {
          const e = new Date(day);
          const [h, m] = parseTimeHoursMinutes(returnTime, 10, 0);
          e.setHours(h, m, 0, 0);
          // If customer picks same day or return is earlier than pickup, advance by 24h (1-day rental)
          if (e <= startDate) {
            e.setDate(e.getDate() + 1);
          }
          setEndDate(e);
          if (typeof window !== "undefined") {
            const sp = new URLSearchParams(window.location.search);
            if (startDate) sp.set("startDate", startDate.toISOString());
            sp.set("endDate", e.toISOString());
            const newUrl = `${window.location.pathname}?${sp.toString()}`;
            window.history.replaceState(null, "", newUrl);
          }
        }
      }
    }
  }

  const handlePickupTimeChange = (newTime) => {
    setPickupTime(newTime);
    if (startDate) {
      const s = new Date(startDate);
      const [h, m] = parseTimeHoursMinutes(newTime, 10, 0);
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
      const [h, m] = parseTimeHoursMinutes(newTime, 10, 0);
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
    const [h, min] = parseTimeHoursMinutes(pickupTime, 10, 0);
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
      const [h, min] = parseTimeHoursMinutes(pickupTime, 10, 0);
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

    setError(null);
    const e = new Date(chosen);
    const [h, min] = parseTimeHoursMinutes(returnTime, 10, 0);
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

  const handleAddDays = (daysToAdd) => {
    let baseStart = startDate ? new Date(startDate) : new Date(today);
    baseStart.setHours(0, 0, 0, 0);

    if (!startDate) {
      let curStart = new Date(baseStart);
      while (isDateBooked(curStart, bookedDates)) {
        curStart.setDate(curStart.getDate() + 1);
      }
      baseStart = curStart;
      const s = new Date(baseStart);
      const [h, min] = parseTimeHoursMinutes(pickupTime, 10, 0);
      s.setHours(h, min, 0, 0);
      setStartDate(s);
    }

    // If an endDate already exists, extend from current endDate; otherwise set totalDays = daysToAdd
    let targetEnd;
    if (endDate) {
      targetEnd = new Date(endDate);
      targetEnd.setDate(targetEnd.getDate() + daysToAdd);
    } else {
      targetEnd = new Date(baseStart);
      targetEnd.setDate(targetEnd.getDate() + daysToAdd);
    }

    // Check for conflicts along the range
    let hasOverlap = false;
    let cur = new Date(baseStart);
    while (cur <= targetEnd) {
      const isMyHold = activeUserHold && (
        (() => {
          const s = new Date(activeUserHold.startDate); s.setHours(0, 0, 0, 0);
          const e = new Date(activeUserHold.endDate); e.setHours(23, 59, 59, 999);
          const t = new Date(cur); t.setHours(12, 0, 0, 0);
          return t >= s && t <= e;
        })()
      );
      if (isDateBooked(cur, bookedDates) && !isMyHold) {
        hasOverlap = true;
        break;
      }
      cur.setDate(cur.getDate() + 1);
    }

    if (hasOverlap) {
      setError(`Cannot extend by ${daysToAdd} ${daysToAdd === 1 ? 'day' : 'days'}: dates are already booked by another customer.`);
      setTimeout(() => setError(null), 3500);
      return;
    }

    const [h, min] = parseTimeHoursMinutes(returnTime, 10, 0);
    targetEnd.setHours(h, min, 0, 0);
    setEndDate(targetEnd);

    const currentViewYear = viewDate.getFullYear();
    const currentViewMonth = viewDate.getMonth();
    const targetYear = targetEnd.getFullYear();
    const targetMonth = targetEnd.getMonth();
    const monthDiff = (targetYear - currentViewYear) * 12 + (targetMonth - currentViewMonth);
    if (monthDiff > 1) {
      setViewDate(new Date(targetYear, targetMonth - 1, 1));
    }
  };

  const handleDecreaseDays = (daysToSubtract = 1) => {
    if (!startDate || !endDate) return;

    const baseStart = new Date(startDate);
    const curEnd = new Date(endDate);
    const targetEnd = new Date(curEnd);
    targetEnd.setDate(targetEnd.getDate() - daysToSubtract);

    // Calculate days between baseStart and targetEnd
    const diffDays = Math.ceil((targetEnd.getTime() - baseStart.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 1) {
      setError("Minimum rental duration is 1 day.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const [h, min] = parseTimeHoursMinutes(returnTime, 10, 0);
    targetEnd.setHours(h, min, 0, 0);
    setEndDate(targetEnd);

    const currentViewYear = viewDate.getFullYear();
    const currentViewMonth = viewDate.getMonth();
    const targetYear = targetEnd.getFullYear();
    const targetMonth = targetEnd.getMonth();
    const monthDiff = (targetYear - currentViewYear) * 12 + (targetMonth - currentViewMonth);
    if (monthDiff < 0 || monthDiff > 1) {
      setViewDate(new Date(targetYear, targetMonth, 1));
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
      const [h, min] = parseTimeHoursMinutes(pickupTime, 10, 0);
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
    const [h, min] = parseTimeHoursMinutes(returnTime, 10, 0);
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

  const isDatesModified = Boolean(
    activeUserHold &&
    endDate &&
    (
      new Date(endDate).getTime() !== new Date(activeUserHold.endDate).getTime() ||
      new Date(startDate).getTime() !== new Date(activeUserHold.startDate).getTime()
    )
  );

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
    if (activeUserHold?._id && !isDatesModified) {
      router.push(`/booking/checkout?bookingId=${activeUserHold._id}`);
      return;
    }

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
      addToBasket(
        {
          car,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        { openDrawer: false, showToast: true }
      );
      router.push(`/auth/login?redirect=/booking/checkout?carId=${carId}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    // If extending an existing active hold
    if (activeUserHold?._id && isDatesModified) {
      try {
        const extRes = await extendBooking(activeUserHold._id, { newEndDate: endDate.toISOString() }, token);
        if (extRes.success && extRes.booking) {
          setActiveUserHold(extRes.booking);
          setHoldSecondsRemaining(900);
          addToBasket(
            {
              car,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            },
            { openDrawer: false, showToast: false }
          );
          if (showToast) {
            const diffDays = extRes.booking.totalDays - (activeUserHold.totalDays || 1);
            if (diffDays < 0) {
              showToast(`Reservation reduced to ${extRes.booking.totalDays} ${extRes.booking.totalDays === 1 ? 'day' : 'days'}!`, "success");
            } else if (diffDays > 0) {
              showToast(`Reservation extended to ${extRes.booking.totalDays} days!`, "success");
            } else {
              showToast(`Reservation updated to ${extRes.booking.totalDays} days!`, "success");
            }
          }
          if (typeof refreshActiveHold === "function") {
            refreshActiveHold();
          }
          router.push(`/booking/checkout?bookingId=${extRes.booking._id}`);
          return;
        } else {
          setError(extRes.message || "Failed to extend booking dates. Please choose different dates.");
          setSubmitting(false);
          return;
        }
      } catch (err) {
        setError(err?.message || "Error extending booking hold. Please try again.");
        setSubmitting(false);
        return;
      }
    }

    try {
      addToBasket(
        {
          car,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        { openDrawer: false, showToast: true }
      );
      const data = await createBooking(
        {
          carId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        token
      );
      if (data.success && data.booking) {
        if (typeof refreshActiveHold === "function") {
          refreshActiveHold();
        }
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

  async function handleRefreshToken() {
    if (refreshingToken) return;
    setRefreshingToken(true);
    try {
      const newToken = await refreshAuthToken();
      if (newToken) {
        setError(null);
        showToast?.("Session refreshed", "success");
        await handleBookNow();
      } else {
        session.clear();
        const redirectTarget = carId ? `/booking?carId=${carId}` : "/booking";
        router.push(`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`);
      }
    } catch {
      session.clear();
      const redirectTarget = carId ? `/booking?carId=${carId}` : "/booking";
      router.push(`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`);
    } finally {
      setRefreshingToken(false);
    }
  }

  const gallery = useMemo(() => {
    if (car?.photos && Array.isArray(car.photos) && car.photos.length > 0) {
      return car.photos.map((p, idx) => getCarPhotoUrl(p, idx));
    }
    return SAMPLE_GALLERY_PHOTOS;
  }, [car]);

  const featuresList = useMemo(() => {
    if (car?.features && Array.isArray(car.features) && car.features.length > 0) {
      return car.features;
    }
    return [
      "Apple CarPlay & Android Auto",
      "Bluetooth & USB-C Fast Charging",
      "HD Backup Camera & Parking Sensors",
      "Dual-Zone Air Conditioning & Climate Control",
      "Cruise Control & Speed Limiter",
      "Tinted UV & Privacy Protection Glass",
      "Keyless Entry & Push Button Start",
      "Anti-lock Brakes (ABS) & Stability Control",
      "Advanced Airbag System (Front & Curtain)",
    ];
  }, [car?.features]);

  const month1 = buildDaysForMonth(0);
  const month2 = buildDaysForMonth(1);

  if (loading) {
    return <BookingPageSkeleton />;
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

  const handleNavbarSearchSubmit = (filters) => {
    // If user clicked search for a different location or vehicle type, navigate to home search
    const carCity = car?.location?.city || "Phnom Penh";
    const carCat = car?.category || "Sedan";
    if (
      (filters.location && filters.location !== "All Locations" && filters.location !== carCity) ||
      (filters.vehicle && filters.vehicle !== "All Types" && filters.vehicle !== carCat)
    ) {
      const q = new URLSearchParams();
      if (filters.location && filters.location !== "All Locations") q.set("city", filters.location);
      if (filters.startDate) q.set("start", filters.startDate.toISOString());
      if (filters.endDate) q.set("end", filters.endDate.toISOString());
      if (filters.vehicle && filters.vehicle !== "All Types") q.set("vehicle", filters.vehicle);
      router.push(`/?${q.toString()}`);
      return;
    }

    // User picked dates in the Navbar on this booking page
    if (filters.startDate && filters.endDate) {
      const s = new Date(filters.startDate);
      const [ph, pm] = parseTimeHoursMinutes(pickupTime, 10, 0);
      s.setHours(ph, pm, 0, 0);

      const e = new Date(filters.endDate);
      const [rh, rm] = parseTimeHoursMinutes(returnTime, 10, 0);
      e.setHours(rh, rm, 0, 0);

      // Validate against booked dates
      let hasOverlap = false;
      const checkStart = new Date(s);
      checkStart.setHours(0, 0, 0, 0);
      const checkEnd = new Date(e);
      checkEnd.setHours(0, 0, 0, 0);

      let cur = new Date(checkStart);
      while (cur <= checkEnd) {
        if (isDateBooked(cur, bookedDates)) {
          hasOverlap = true;
          break;
        }
        cur.setDate(cur.getDate() + 1);
      }

      if (hasOverlap) {
        setError("Those dates include days already booked for this vehicle. Please pick different dates.");
        setTimeout(() => setError(null), 4000);
      } else {
        setStartDate(s);
        setEndDate(e);
        setViewDate(new Date(s.getFullYear(), s.getMonth(), 1));
        if (typeof window !== "undefined") {
          const sp = new URLSearchParams(window.location.search);
          sp.set("startDate", s.toISOString());
          sp.set("endDate", e.toISOString());
          const newUrl = `${window.location.pathname}?${sp.toString()}`;
          window.history.replaceState(null, "", newUrl);
        }
      }
    } else if (!filters.startDate && !filters.endDate) {
      setStartDate(null);
      setEndDate(null);
      if (typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search);
        sp.delete("start");
        sp.delete("startDate");
        sp.delete("end");
        sp.delete("endDate");
        const newQuery = sp.toString();
        const newUrl = newQuery ? `${window.location.pathname}?${newQuery}` : window.location.pathname;
        window.history.replaceState(null, "", newUrl);
      }
    }
  };

  return (
    <>
      <Navbar
        initialSearch={{
          startDate,
          endDate,
          location: car?.location?.city || "All Locations",
          vehicle: car?.category || "All Types",
        }}
        onSearchSubmit={handleNavbarSearchSubmit}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 py-8 relative pb-24 lg:pb-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          className="mb-5"
          items={[
            { label: "Home", href: "/" },
            { label: `${car?.year || 2024} ${brand} ${model}`.trim() || "Booking" },
          ]}
        />

        {/* Booking Funnel Progress Stepper */}
        <BookingStepIndicator currentStep={startDate && endDate ? 2 : 1} />

        {/* Header & Gallery */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
                <span>{car?.category || "Sedan"}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {city}
                </span>
                <span>·</span>
                <span>Free 24h cancellation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {car?.year || 2024} {brand} {model} {car?.trim || ""}
              </h1>
              {car?.averageRating ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1.5 font-medium">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-slate-900">{Number(car.averageRating).toFixed(1)}</span>
                  {car?.reviewCount ? <span>({car.reviewCount} trips)</span> : null}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(window.location.href);
                    showToast("Link copied");
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
              <button
                type="button"
                onClick={() => toggleWishlist(car)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Heart className={`w-3.5 h-3.5 ${wishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
                <span>{wishlisted ? "Saved" : "Save"}</span>
              </button>
            </div>
          </div>

          {/* Photo Gallery Grid */}
          <div className="rounded-2xl overflow-hidden relative group h-[300px] md:h-[420px]">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-2 h-full">
              <div className="relative h-full row-span-2 cursor-pointer overflow-hidden">
                <img
                  src={gallery[0] || SAMPLE_GALLERY_PHOTOS[0]}
                  alt={`${brand} ${model}`}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                  onError={(e) => { e.target.src = SAMPLE_GALLERY_PHOTOS[0]; }}
                  onClick={() => setSelectedPhotoIndex(0)}
                />
              </div>

              {[1, 2, 3, 4].map((idx) => {
                const photo = gallery[idx] || SAMPLE_GALLERY_PHOTOS[idx % SAMPLE_GALLERY_PHOTOS.length];
                return (
                  <div key={idx} className="hidden md:block relative h-full w-full cursor-pointer overflow-hidden">
                    <img
                      src={photo}
                      alt={`${brand} ${model} ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                      onError={(e) => { e.target.src = SAMPLE_GALLERY_PHOTOS[idx % SAMPLE_GALLERY_PHOTOS.length]; }}
                      onClick={() => setSelectedPhotoIndex(idx)}
                    />
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-900 shadow-sm border border-slate-200 hover:bg-white flex items-center gap-1.5 cursor-pointer"
              onClick={() => setSelectedPhotoIndex((prev) => (prev + 1) % gallery.length)}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{gallery.length} photos</span>
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-10 items-start">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Compact Vehicle Specifications */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                  <Settings2 className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Transmission</div>
                    <div className="text-xs font-bold text-slate-900 truncate">{car?.transmission || "Automatic"}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Seats</div>
                    <div className="text-xs font-bold text-slate-900 truncate">{car?.seats || 5} seats</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                  <Fuel className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Fuel</div>
                    <div className="text-xs font-bold text-slate-900 truncate">{car?.fuelType || "Gasoline"}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                  <Gauge className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Mileage</div>
                    <div className="text-xs font-bold text-slate-900 truncate">250 km/day</div>
                  </div>
                </div>
              </div>

              {car?.description && (
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  {car.description}
                </p>
              )}

              {/* Included Features */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  Features
                </h3>
                <div className="flex flex-wrap gap-2">
                  {featuresList.slice(0, 6).map((feature, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs font-medium text-slate-700"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Concise Rental Rules */}
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                <span>Age 21+ with valid license</span>
                <span>·</span>
                <span>Same-to-same fuel</span>
                <span>·</span>
                <span>No smoking</span>
              </div>
            </div>

            {/* Availability Calendar */}
            <div id="rental-calendar" className="scroll-mt-24">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Select dates</h2>
                  <p className="text-xs text-slate-500">Choose pick-up and return dates</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Available
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Booked
                  </span>
                  {activeUserHold && (
                    <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Your hold
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Selected
                  </span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="mb-5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
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

                  {/* Quick duration & extension presets */}
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60 overflow-x-auto text-xs py-0.5">
                    <span className="text-[10px] font-bold text-slate-500 tracking-wider mr-0.5 whitespace-nowrap">
                      {activeUserHold || (startDate && endDate) ? "Adjust:" : "Adjust:"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDecreaseDays(1)}
                      disabled={totalDays <= 1 || !startDate || !endDate}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 text-rose-700 hover:text-white font-bold text-xs transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-50 disabled:hover:text-rose-700 disabled:hover:border-rose-200 whitespace-nowrap"
                      title={totalDays <= 1 ? "Minimum rental duration is 1 day" : "Decrease by 1 day (-1d)"}
                    >
                      -1 Day
                    </button>
                    <span className="w-px h-3.5 bg-slate-300 mx-0.5 shrink-0" />
                    <button
                      type="button"
                      onClick={() => handleAddDays(1)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 text-blue-700 hover:text-white font-bold text-xs transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                      title="Add 1 day"
                    >
                      +1 Day
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddDays(2)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 text-blue-700 hover:text-white font-bold text-xs transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                      title="Add 2 days"
                    >
                      +2 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddDays(3)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 text-blue-700 hover:text-white font-bold text-xs transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                      title="Add 3 days"
                    >
                      +3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddDays(4)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-blue-600 text-blue-700 hover:text-white font-bold text-xs transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                      title="Add 4 days"
                    >
                      +4 Days
                    </button>
                    <span className="w-px h-4 bg-slate-300 mx-1 shrink-0" />
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
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 font-semibold text-xs transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                      title="Set rental to 1 month (30 days)"
                    >
                      +1 Month
                    </button>
                  </div>
                </div>

                {/* Navigation Header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={prevMonth}
                    disabled={isCurrentMonth}
                    className="rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center w-8 h-8"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold text-slate-900 sm:hidden">
                    {MONTH_NAMES[month1.month]} {month1.year}
                  </span>
                  <div className="hidden sm:flex items-center gap-16 font-bold text-sm text-slate-900">
                    <span>{MONTH_NAMES[month1.month]} {month1.year}</span>
                    <span>{MONTH_NAMES[month2.month]} {month2.year}</span>
                  </div>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="rounded-full border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center justify-center w-8 h-8"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 1 or 2 Months Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <CalendarMonth
                    variant="booking"
                    days={month1.days}
                    year={month1.year}
                    month={month1.month}
                    startDate={startDate}
                    endDate={endDate}
                    today={today}
                    bookedDates={bookedDates}
                    activeHold={activeUserHold}
                    onDayClick={handleDayClick}
                  />
                  <div className="hidden md:block">
                    <CalendarMonth
                      variant="booking"
                      days={month2.days}
                      year={month2.year}
                      month={month2.month}
                      startDate={startDate}
                      endDate={endDate}
                      today={today}
                      bookedDates={bookedDates}
                      activeHold={activeUserHold}
                      onDayClick={handleDayClick}
                    />
                  </div>
                </div>

                {/* Selection Status */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    {activeUserHold ? (
                      <span className="text-amber-800 font-semibold">
                        Hold active: {formatDateDisplay(new Date(activeUserHold.startDate))} – {formatDateDisplay(new Date(activeUserHold.endDate))}
                      </span>
                    ) : !startDate ? (
                      <span className="text-slate-500">Select a pick-up date</span>
                    ) : !endDate ? (
                      <span className="text-slate-600">
                        Pick-up: <strong className="text-slate-900">{formatDateDisplay(startDate)}</strong> · Select return date
                      </span>
                    ) : (
                      <span className="text-slate-700">
                        <strong className="text-slate-900">{formatDateDisplay(startDate)}</strong> – <strong className="text-slate-900">{formatDateDisplay(endDate)}</strong>{" "}
                        <span className="text-blue-700 font-semibold">({totalDays} {totalDays === 1 ? "day" : "days"})</span>
                      </span>
                    )}
                  </div>
                  {startDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate(null);
                        setEndDate(null);
                        if (setContextDateRange) {
                          setContextDateRange({ startDate: null, endDate: null });
                        }
                        if (carId) {
                          router.replace(`/booking?carId=${carId}`);
                        }
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-rose-600 cursor-pointer self-end sm:self-auto"
                    >
                      Clear dates
                    </button>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Pick-up Location */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-3">Pick-up location</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                <div className="bg-slate-100 rounded-2xl h-[210px] border border-slate-200 overflow-hidden relative">
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
                <div className="space-y-3 text-xs sm:text-sm">
                  <div>
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{fullAddress}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Station pick-up</span>
                      <span className="font-semibold text-emerald-700">Free</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Airport &amp; hotel delivery</span>
                      <span className="font-medium text-slate-800">Available</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Host */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center text-base font-bold shrink-0">
                {car?.host?.name ? car.host.name.charAt(0).toUpperCase() : "D"}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {car?.host?.name || "DriveKH Fleet"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified host · Usually responds within 15 minutes
                </p>
              </div>
            </div>
          </div>

          {/* Sticky Booking Sidebar */}
          <div className="sticky top-24 w-full z-10">
            <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <ActiveHoldBanner
                activeUserHold={activeUserHold}
                holdSecondsRemaining={holdSecondsRemaining}
                cancellingHold={cancellingHold}
                onCancelHold={handleCancelHold}
              />

              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-bold text-slate-900">${pricePerDay.toFixed(2)}</span>
                <span className="text-slate-500 text-xs">/ day</span>
              </div>

              {/* Pick-up & Return Date/Time */}
              <div className="mb-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Pick-up
                    </label>
                    <div className="relative bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-2 cursor-pointer">
                      <span className={`text-xs font-medium block truncate ${startDate ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                        {startDate ? formatDateDisplay(startDate) : "Select date"}
                      </span>
                      <input
                        onClick={() => document.getElementById("rental-calendar")?.scrollIntoView({ behavior: "smooth" })}
                        type="date"
                        value={toDateInputValue(startDate)}
                        min={toDateInputValue(today)}
                        onChange={(e) => handlePickupDateInput(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        aria-label="Pick-up Date"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Return
                    </label>
                    <div className="relative bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-2 cursor-pointer">
                      <span className={`text-xs font-medium block truncate ${endDate ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                        {endDate ? formatDateDisplay(endDate) : "Select date"}
                      </span>
                      <input
                        onClick={() => document.getElementById("rental-calendar")?.scrollIntoView({ behavior: "smooth" })}
                        type="date"
                        value={toDateInputValue(endDate)}
                        min={toDateInputValue(startDate || today)}
                        onChange={(e) => handleReturnDateInput(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        aria-label="Return Date"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={pickupTime}
                    onChange={(e) => handlePickupTimeChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600"
                    aria-label="Pick-up Time"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={`p-${t}`} value={t}>Pick-up: {formatTimeDisplay(t)}</option>
                    ))}
                  </select>
                  <select
                    value={returnTime}
                    onChange={(e) => handleReturnTimeChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-600"
                    aria-label="Return Time"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={`r-${t}`} value={t}>Return: {formatTimeDisplay(t)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price Summary */}
              <div className="space-y-2.5 mb-4">
                {isDatesModified && activeUserHold && (
                  <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 text-xs flex items-center justify-between">
                    <span className="font-medium text-amber-900">
                      {activeUserHold.totalDays || 1}d → {totalDays}d
                    </span>
                    <span className="font-bold text-amber-900">
                      {carRentalTotal >= (activeUserHold.totalPrice || 0) ? "+$" : "-$"}
                      {Math.abs(carRentalTotal - (activeUserHold.totalPrice || 0)).toFixed(2)}
                    </span>
                  </div>
                )}

                <PriceSummaryCard
                  pricePerDay={pricePerDay}
                  totalDays={totalDays}
                  carRentalTotal={carRentalTotal}
                  grandTotal={grandTotal}
                />

                <div className="flex justify-between text-xs text-slate-500 px-1">
                  <span>Refundable deposit</span>
                  <span className="font-semibold text-slate-700">$100.00</span>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{error}</span>
                  {isTokenError(error) && (
                    <button
                      type="button"
                      onClick={handleRefreshToken}
                      disabled={refreshingToken}
                      title="Refresh session token"
                      aria-label="Refresh session token"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshingToken ? "animate-spin" : ""}`} />
                      <span>{refreshingToken ? "Refreshing…" : "Refresh"}</span>
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleBookNow}
                disabled={submitting}
                className={`w-full py-3 px-4 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                  submitting
                    ? "bg-slate-400 cursor-wait"
                    : !startDate || !endDate
                    ? "bg-slate-900 hover:bg-slate-800"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submitting
                  ? "Reserving…"
                  : isDatesModified
                  ? `Update to ${totalDays} days`
                  : activeUserHold
                  ? "Continue checkout"
                  : !startDate || !endDate
                  ? "Select dates"
                  : "Continue"}
                {!submitting && <ArrowRight className="w-4 h-4" />}
              </button>

              <p className="text-[11px] text-slate-400 text-center mt-3">
                No payment yet · 15-minute hold
              </p>
            </div>
          </div>
        </div>

        {/* Mobile Sticky CTA Bar */}
        {!loading && car && (
          <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-500">
                {totalDays > 0 ? `${totalDays} ${totalDays === 1 ? "day" : "days"}` : "Daily rate"}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-slate-900">
                  {totalDays > 0 ? `$${grandTotal.toFixed(0)}` : `$${pricePerDay.toFixed(0)}`}
                </span>
                <span className="text-xs text-slate-500">
                  {totalDays > 0 ? "total" : "/ day"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleBookNow}
              disabled={submitting}
              className={`py-2.5 px-5 rounded-xl text-xs font-semibold text-white cursor-pointer ${
                submitting
                  ? "bg-slate-400"
                  : !startDate || !endDate
                  ? "bg-slate-900"
                  : "bg-blue-600"
              }`}
            >
              {submitting ? "Reserving…" : activeUserHold ? "Checkout" : !startDate || !endDate ? "Select dates" : "Continue"}
            </button>
          </div>
        )}
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

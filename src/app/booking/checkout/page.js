"use client";
import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  getMyBookings,
  getBookingById,
  createBooking,
  cancelBooking,
  checkoutPayment,
  getCar,
  getCarPhotoUrl,
} from "@/lib/api";
import { useBasket } from "@/context/BasketContext";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  Mail,
  FileText,
  UploadCloud,
  CheckCircle2,
  ShieldCheck,
  Shield,
  Gauge,
  MapPin,
  Clock,
  Car,
  Plane,
  Lock,
  Timer,
  AlertCircle,
  Calendar,
  Sparkles,
  RotateCcw,
} from "lucide-react";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("kid_access_token");
}

function formatSeconds(secs) {
  const safeSecs = Math.max(0, Number(secs) || 0);
  const m = Math.floor(safeSecs / 60);
  const s = safeSecs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const carIdParam = searchParams.get("carId");

  const {
    items,
    remainingHoldSeconds,
    isHoldExpired,
    resetHold,
    showToast,
    clearBasket,
  } = useBasket();

  const [booking, setBooking] = useState(null);
  const [directCar, setDirectCar] = useState(() => {
    return items.length > 0 ? items[0].car : null;
  });
  const [loading, setLoading] = useState(() => {
    return !(bookingId === "basket" || (!bookingId && items.length > 0));
  });
  const [paying, setPaying] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);

  // Live Hold Countdown State
  const [remainingSeconds, setRemainingSeconds] = useState(900);
  const [isExpired, setIsExpired] = useState(false);

  // Driver Details & License
  const [driverName, setDriverName] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored).name || "" : "";
    } catch {
      return "";
    }
  });
  const [driverPhone, setDriverPhone] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored).phoneNumber || "" : "";
    } catch {
      return "";
    }
  });
  const [driverEmail, setDriverEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored).email || "" : "";
    } catch {
      return "";
    }
  });
  const [driverLicenseNumber, setDriverLicenseNumber] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.driverLicense) return u.driverLicense;
        if (u.kid) return `KID-DL-${u.kid}`;
      }
      return "";
    } catch {
      return "";
    }
  });
  const [licenseFrontUploaded, setLicenseFrontUploaded] = useState(false);
  const [licenseBackUploaded, setLicenseBackUploaded] = useState(false);
  const [frontFileName, setFrontFileName] = useState("");
  const [backFileName, setBackFileName] = useState("");

  // Pickup & Logistics
  const [deliveryOption, setDeliveryOption] = useState("branch");
  const [pickupBranch, setPickupBranch] = useState("Phnom Penh Airport Terminal Depot");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupTime, setPickupTime] = useState("09:00 AM");
  const [returnTime, setReturnTime] = useState("06:00 PM");
  const [flightNumber, setFlightNumber] = useState("");

  // Terms Agreement
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Fetch Booking or Car
  useEffect(() => {
    const token = getToken();

    if (bookingId === "basket" || (!bookingId && items.length > 0)) {
      if (items.length === 0 && carIdParam) {
        getCar(carIdParam)
          .then((res) => {
            if (res.success) setDirectCar(res.car || res.data);
          })
          .finally(() => setLoading(false));
      }
      return;
    }

    if (!token && !bookingId) {
      router.push("/auth/login?redirect=/booking/checkout");
      return;
    }

    if (bookingId && bookingId !== "basket") {
      getBookingById(bookingId, token)
        .then((data) => {
          if (data.success && data.booking) {
            setBooking(data.booking);
            if (typeof data.booking.car === "string") {
              getCar(data.booking.car).then((res) => {
                if (res.success) setDirectCar(res.car || res.data);
              });
            } else if (data.booking.car && typeof data.booking.car === "object") {
              setDirectCar(data.booking.car);
            }
            if (data.booking.customer) {
              const c = data.booking.customer;
              if (c.name && !driverName) setDriverName(c.name);
              if (c.email && !driverEmail) setDriverEmail(c.email);
              if (c.phoneNumber && !driverPhone) setDriverPhone(c.phoneNumber);
              if (c.driverLicense && !driverLicenseNumber) setDriverLicenseNumber(c.driverLicense);
            }
          } else {
            return getMyBookings(token || "dummy").then((myRes) => {
              if (myRes.success) {
                const found = (myRes.bookings || []).find((b) => b._id === bookingId);
                if (found) setBooking(found);
                else if (carIdParam) {
                  getCar(carIdParam).then((c) => {
                    if (c.success) setDirectCar(c.car || c.data);
                  });
                }
              }
            });
          }
        })
        .catch(() => {
          if (carIdParam) {
            getCar(carIdParam).then((c) => {
              if (c.success) setDirectCar(c.car || c.data);
            });
          }
        })
        .finally(() => setLoading(false));
    } else {
      queueMicrotask(() => setLoading(false));
    }
  }, [bookingId, carIdParam, items, router]);

  // Derived details
  const activeCar =
    (booking?.car && typeof booking.car === "object" ? booking.car : null) ||
    directCar ||
    (items.length > 0 ? items[0].car : null);

  const carTitle =
    activeCar?.brand || activeCar?.make
      ? `${activeCar?.brand || activeCar?.make} ${activeCar?.modelName || activeCar?.model || ""}`.trim()
      : activeCar?.name ||
        activeCar?.title ||
        activeCar?.modelName ||
        "Toyota Corolla Cross";

  const start = useMemo(() => {
    if (booking?.startDate) return new Date(booking.startDate);
    if (items.length > 0 && items[0].startDate) return new Date(items[0].startDate);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }, [booking, items]);

  const end = useMemo(() => {
    if (booking?.endDate) return new Date(booking.endDate);
    if (items.length > 0 && items[0].endDate) return new Date(items[0].endDate);
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d;
  }, [booking, items]);

  const totalDays = booking?.totalDays || Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const dailyRate = activeCar?.pricePerDay || 35;
  const carSubtotal = dailyRate * totalDays;

  // Single source of truth: Database booking.totalPrice
  const totalAmount =
    booking?.totalPrice != null
      ? Number(booking.totalPrice)
      : carSubtotal;

  // Live 1-second hold countdown ticker
  useEffect(() => {
    const getTargetTime = () => {
      if (booking?.holdExpiresAt) {
        return new Date(booking.holdExpiresAt).getTime();
      }
      const storageKey = `dkh_hold_${bookingId || carIdParam || "checkout"}`;
      const saved = typeof window !== "undefined" ? sessionStorage.getItem(storageKey) : null;
      if (saved && !isNaN(Number(saved))) {
        return Number(saved);
      }
      const fresh = Date.now() + 15 * 60 * 1000;
      if (typeof window !== "undefined") sessionStorage.setItem(storageKey, String(fresh));
      return fresh;
    };

    const targetTime = getTargetTime();

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      setRemainingSeconds(diff);
      setIsExpired(diff <= 0);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [booking?.holdExpiresAt, bookingId, carIdParam]);

  const handleReReserve = async () => {
    setRenewing(true);
    setError(null);
    try {
      const token = getToken();
      const targetCarId = activeCar?._id || carIdParam;
      if (token && targetCarId) {
        const res = await createBooking(
          {
            carId: targetCarId,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          },
          token
        );
        if (res.success && res.booking) {
          setBooking(res.booking);
          const newExp = res.booking.holdExpiresAt
            ? new Date(res.booking.holdExpiresAt).getTime()
            : Date.now() + 15 * 60 * 1000;
          setRemainingSeconds(Math.max(0, Math.floor((newExp - Date.now()) / 1000)));
          setIsExpired(false);
          const storageKey = `dkh_hold_${res.booking._id}`;
          if (typeof window !== "undefined") sessionStorage.setItem(storageKey, String(newExp));
          router.replace(`/booking/checkout?bookingId=${res.booking._id}`);
          showToast("Car re-reserved for 15 minutes!", "success");
          return;
        }
      }

      const fresh = Date.now() + 15 * 60 * 1000;
      const storageKey = `dkh_hold_${bookingId || carIdParam || "checkout"}`;
      if (typeof window !== "undefined") sessionStorage.setItem(storageKey, String(fresh));
      setRemainingSeconds(900);
      setIsExpired(false);
      resetHold();
      showToast("Reservation extended by 15 minutes", "success");
    } catch {
      setError("Could not renew hold. Please try again.");
    } finally {
      setRenewing(false);
    }
  };

  const handleCancelBooking = async () => {
    const token = getToken();
    const targetCarId = activeCar?._id || booking?.car?._id || booking?.car || carIdParam;
    if (!booking?._id) {
      router.push(targetCarId ? `/booking?carId=${targetCarId}` : "/");
      return;
    }
    setCancelling(true);
    try {
      await cancelBooking(booking._id, "Customer cancelled at checkout", token);
      showToast("Reservation hold released. Car is now available.", "info");
      router.push(targetCarId ? `/booking?carId=${targetCarId}` : "/");
    } catch (err) {
      console.error("Cancel booking error:", err);
      router.push(targetCarId ? `/booking?carId=${targetCarId}` : "/");
    } finally {
      setCancelling(false);
    }
  };

  const handleFileUpload = (side, file) => {
    if (!file) return;
    if (side === "front") {
      setLicenseFrontUploaded(true);
      setFrontFileName(file.name);
      showToast("Front license photo attached!");
    } else {
      setLicenseBackUploaded(true);
      setBackFileName(file.name);
      showToast("Back license photo attached!");
    }
  };

  const isDriverComplete = Boolean(driverName.trim() && driverPhone.trim() && driverEmail.trim());

  async function handlePay() {
    if (isExpired) {
      setError("Reservation hold has expired. Please re-reserve to continue.");
      return;
    }
    if (!driverName.trim()) {
      setError("Please enter the driver's name.");
      document.getElementById("driver-info")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!driverPhone.trim()) {
      setError("Please enter a phone number.");
      document.getElementById("driver-info")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!driverEmail.trim()) {
      setError("Please enter an email address.");
      document.getElementById("driver-info")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!acceptedTerms) {
      setError("Please agree to the rental terms before proceeding.");
      document.getElementById("payment-section")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const token = getToken();
    if (!token) {
      router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    setPaying(true);
    setError(null);

    try {
      let targetBookingId = booking?._id;

      // If user arrived without a created booking in DB yet
      if (!targetBookingId && activeCar) {
        const createRes = await createBooking(
          {
            carId: activeCar._id || activeCar.id,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          },
          token
        );
        if (createRes.success && createRes.booking) {
          targetBookingId = createRes.booking._id;
          setBooking(createRes.booking);
        } else {
          setError(createRes.message || "Could not reserve vehicle. Please check date availability.");
          setPaying(false);
          return;
        }
      }

      if (!targetBookingId) {
        setError("Booking reference not found. Please pick your dates first.");
        setPaying(false);
        return;
      }

      const clientOrigin = window.location.origin;
      const data = await checkoutPayment(
        {
          bookingId: targetBookingId,
          successUrl: `${clientOrigin}/booking/success?bookingId=${targetBookingId}&paid=true`,
          cancelUrl: `${clientOrigin}/booking/checkout?bookingId=${targetBookingId}`,
        },
        token
      );

      const paymentUrl =
        data.paymentUrl || data.checkout?.paymentUrl || data.data?.paymentUrl;

      if (data.success && paymentUrl) {
        clearBasket();
        // Redirect customer directly to Baray checkout gateway
        window.location.href = paymentUrl;
        return;
      } else {
        setError(data.message || "Failed to initialize Baray payment gateway. Please try again.");
        setPaying(false);
      }
    } catch (err) {
      console.error("Payment checkout error:", err);
      setError(err?.message || "An unexpected error occurred while connecting to Baray.");
      setPaying(false);
    }
  }

  const handleBackToBooking = () => {
    const targetCarId =
      carIdParam ||
      booking?.car?._id ||
      booking?.car?.id ||
      items?.[0]?.car?._id ||
      items?.[0]?.car?.id;

    if (targetCarId) {
      router.push(`/booking?carId=${targetCarId}`);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="text-center py-32">
          <div className="w-9 h-9 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spinner mx-auto mb-4" />
          <p className="text-sm font-semibold text-slate-500">Loading checkout…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* Back Link */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleBackToBooking}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
          >
            <ArrowLeft
              size={16}
              strokeWidth={2.5}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            Back to car details
          </button>
        </div>

        {/* Hold Countdown Header Bar or Expired Card */}
        {isExpired ? (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Timer className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-rose-900">
                  Reservation Expired
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  Your 15-minute hold on this car ended. The car was released.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleReReserve}
                disabled={renewing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{renewing ? "Holding..." : "Re-reserve (+15m)"}</span>
              </button>
              <button
                type="button"
                onClick={() => router.push(activeCar?._id ? `/booking?carId=${activeCar._id}` : "/")}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer"
              >
                Browse Cars
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`mb-6 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between text-xs transition-all border shadow-xs ${
              remainingSeconds <= 60
                ? "bg-rose-50 border-rose-300 text-rose-900 animate-pulse"
                : remainingSeconds <= 180
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : "bg-blue-50/80 border-blue-200/80 text-blue-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Timer
                className={`w-4 h-4 shrink-0 ${
                  remainingSeconds <= 60
                    ? "text-rose-600"
                    : remainingSeconds <= 180
                    ? "text-amber-600"
                    : "text-blue-600"
                }`}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">
                  {remainingSeconds <= 60
                    ? "Expiring soon:"
                    : remainingSeconds <= 180
                    ? "Hold ends in:"
                    : "Car reserved for you:"}
                </span>
                <strong
                  className={`font-mono text-sm tracking-wide font-extrabold ${
                    remainingSeconds <= 60
                      ? "text-rose-700"
                      : remainingSeconds <= 180
                      ? "text-amber-700"
                      : "text-blue-700"
                  }`}
                >
                  {formatSeconds(remainingSeconds)}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleReReserve}
                disabled={renewing || cancelling}
                className="px-3 py-1.5 bg-white text-slate-800 rounded-xl font-bold text-xs shadow-2xs hover:bg-slate-50 border border-slate-200 hover:border-blue-400 cursor-pointer transition-all flex items-center gap-1 shrink-0 disabled:opacity-50"
                title="Add 15 minutes to your reservation hold"
              >
                <span>+15 mins</span>
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelling || renewing}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 rounded-xl font-bold text-xs shadow-2xs border border-rose-200 hover:border-rose-300 cursor-pointer transition-all flex items-center gap-1 shrink-0 disabled:opacity-50"
                title="Cancel reservation hold and release car"
              >
                <span>{cancelling ? "Releasing…" : "Cancel Hold"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Confirm Booking &amp; Verify Driver
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review your trip details and verify your identity before proceeding to Baray secure payment.
          </p>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-8 items-start">
          {/* Left Column: Unified Section */}
          <div className="space-y-6">
            {/* ========================================================= */}
            {/* CARD 1: CONFIRM BOOKING & TRIP DETAILS */}
            {/* ========================================================= */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                    01
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Trip &amp; Car Details
                    </h2>
                    <p className="text-xs text-slate-500">
                      Confirmed from your reservation
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                  {totalDays} days
                </span>
              </div>

              {/* Car Card Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="w-28 h-20 sm:w-32 sm:h-22 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 shadow-2xs aspect-[16/10]">
                  <img
                    src={getCarPhotoUrl(activeCar?.photos?.[0])}
                    alt={carTitle}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {carTitle}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                      ${dailyRate}/day
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeCar?.category || "Sedan"} · {activeCar?.transmission || "Automatic"} · {activeCar?.seats || 5} seats
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-2 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} –{" "}
                      {end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Handover & Delivery Options */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Pickup &amp; Return Place
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setDeliveryOption("branch")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      deliveryOption === "branch"
                        ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      Pick up at station (Free)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Collect key at airport or city station
                    </div>
                  </div>

                  <div
                    onClick={() => setDeliveryOption("hotel")}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      deliveryOption === "hotel"
                        ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-blue-600" />
                      Deliver to me
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      We bring the car to your hotel or home
                    </div>
                  </div>
                </div>

                {deliveryOption === "branch" ? (
                  <div>
                    <select
                      value={pickupBranch}
                      onChange={(e) => setPickupBranch(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    >
                      <option value="Phnom Penh Airport Terminal Depot">
                        Phnom Penh International Airport Depot (Arrivals Counter 4)
                      </option>
                      <option value="Phnom Penh Downtown Central BKK1">
                        Phnom Penh Downtown Station (BKK1 St 51)
                      </option>
                      <option value="Siem Reap Angkor International Airport">
                        Siem Reap Angkor Airport Station (SAI)
                      </option>
                      <option value="Sihanoukville Coastal Terminal">
                        Sihanoukville Port &amp; Coastal Station
                      </option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. Hotel name, street address, or landmark"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                )}
              </div>

              {/* Time Slots & Flight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Pickup Time
                  </label>
                  <select
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  >
                    {["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "03:00 PM", "05:00 PM"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Return Time
                  </label>
                  <select
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  >
                    {["10:00 AM", "12:00 PM", "02:00 PM", "04:00 PM", "06:00 PM", "08:00 PM", "10:00 PM"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-1.5">
                    <Plane className="w-3.5 h-3.5 text-slate-400" />
                    Flight No. (Optional)
                  </label>
                  <input
                    type="text"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    placeholder="e.g. K6 102"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 uppercase font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Included Benefits & Features */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Included with this Rental
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="text-slate-900 block text-xs">Insurance Protection Included</strong>
                      <span className="text-[11px] text-slate-500">Third-party liability &amp; collision coverage</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-700">
                    <Gauge className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <strong className="text-slate-900 block text-xs">250 km / day Included</strong>
                      <span className="text-[11px] text-slate-500">Standard distance allowance</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-700">
                    <Car className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <strong className="text-slate-900 block text-xs">24/7 Roadside Assist</strong>
                      <span className="text-[11px] text-slate-500">Emergency support across Cambodia</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="text-slate-900 block text-xs">Free Cancellation</strong>
                      <span className="text-[11px] text-slate-500">Up to 24h before trip start</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* CARD 2: DRIVER IDENTITY & LICENSE VERIFICATION */}
            {/* ========================================================= */}
            <div
              id="driver-info"
              className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                    02
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      Driver Information &amp; Verification
                      {isDriverComplete && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Needed for insurance policy and car pickup handover
                    </p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  Required
                </span>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Full Name (on license) *
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Sokha Kheang"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="+855 12 345 678"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email *
                  </label>
                  <input
                    type="email"
                    value={driverEmail}
                    onChange={(e) => setDriverEmail(e.target.value)}
                    placeholder="driver@example.com"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Driver&apos;s License No.
                  </label>
                  <input
                    type="text"
                    value={driverLicenseNumber}
                    onChange={(e) => setDriverLicenseNumber(e.target.value)}
                    placeholder="KH-DL-9874218"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-mono transition-all"
                  />
                </div>
              </div>

              {/* License Photos Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Driver&apos;s License Photos
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Front Upload */}
                  <label
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all block ${
                      licenseFrontUploaded
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-300 hover:border-blue-500 bg-slate-50"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload("front", e.target.files[0])}
                    />
                    {licenseFrontUploaded ? (
                      <div className="space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                        <div className="text-xs font-bold text-emerald-800">
                          Front photo attached
                        </div>
                        <div className="text-[10px] text-emerald-600 truncate max-w-[180px] mx-auto">
                          {frontFileName || "Verified"}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <div className="text-xs font-bold text-slate-800">Front of License</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Tap or upload photo</div>
                      </div>
                    )}
                  </label>

                  {/* Back Upload */}
                  <label
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all block ${
                      licenseBackUploaded
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-300 hover:border-blue-500 bg-slate-50"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload("back", e.target.files[0])}
                    />
                    {licenseBackUploaded ? (
                      <div className="space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                        <div className="text-xs font-bold text-emerald-800">
                          Back photo attached
                        </div>
                        <div className="text-[10px] text-emerald-600 truncate max-w-[180px] mx-auto">
                          {backFileName || "Verified"}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                        <div className="text-xs font-bold text-slate-800">Back of License</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Tap or upload photo</div>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* CARD 3: PAYMENT & BARAY GATEWAY */}
            {/* ========================================================= */}
            <div
              id="payment-section"
              className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                    03
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Payment &amp; Guarantee
                    </h2>
                    <p className="text-xs text-slate-500">
                      Direct connection to Baray payment gateway
                    </p>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  Safe &amp; Secure
                </span>
              </div>

              {/* Baray Payment Gateway Notice */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block text-xs">Secured by Baray Payment Gateway</strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    When you click pay, you will be redirected to the official Baray gateway to choose your payment method (KHQR, Credit/Debit Card, or Bank Transfer).
                  </p>
                </div>
              </div>

              {/* Security Deposit Notice */}
              <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>$100 Security Deposit:</strong> Held during your trip and returned right after you return the car.
                </span>
              </div>

              {/* Terms Checkbox */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>
                    I agree to the rental terms, car photo inspection, and 24h free cancellation.
                  </span>
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Main Pay CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={paying || isExpired}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-50 active:scale-98 flex items-center justify-center gap-2"
                >
                  {isExpired ? (
                    <>
                      <Timer className="w-4 h-4" />
                      Hold Expired - Please Re-reserve
                    </>
                  ) : paying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spinner" />
                      Connecting to Baray…
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Pay ${totalAmount.toFixed(2)} with Baray
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Cancel Reservation & Release Car */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={cancelling || paying}
                  className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors underline cursor-pointer disabled:opacity-50"
                >
                  {cancelling ? "Releasing car hold…" : "Cancel reservation & release car"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Live Booking Summary */}
          <div className="sticky top-24 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-5">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Booking Summary</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 uppercase">
                Price Details
              </span>
            </h3>

            {/* Car Preview */}
            <div className="flex items-center gap-3">
              <div className="w-20 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 shadow-2xs aspect-[16/10]">
                <img
                  src={getCarPhotoUrl(activeCar?.photos?.[0])}
                  alt={carTitle}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-slate-900 truncate">
                  {carTitle}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {activeCar?.category || "Sedan"} · {activeCar?.transmission || "Automatic"}
                </p>
                <span className="inline-block px-2 py-0.5 mt-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                  🟢 Reserved for you
                </span>
              </div>
            </div>

            {/* Date & Duration */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-700 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Duration:</span>
                <span className="font-bold text-blue-700">{totalDays} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dates:</span>
                <span className="font-semibold">
                  {start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} –{" "}
                  {end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Honest Price Breakdown matching Database */}
            <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span>Car rent (${dailyRate}/day × {totalDays} days)</span>
                <span className="font-semibold text-slate-900">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Insurance Protection</span>
                <span className="font-semibold">Included</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Mileage (250 km/day)</span>
                <span className="font-semibold text-slate-800">Included</span>
              </div>

              <div className="h-px bg-slate-200 my-2" />
              <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                <span>Total to Pay</span>
                <span className="text-lg text-blue-700 font-black">${totalAmount.toFixed(2)}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                <span>Security deposit: $100 (returned after trip)</span>
              </div>
            </div>

            {/* Quick Submit CTA on sidebar */}
            <button
              type="button"
              onClick={handlePay}
              disabled={paying || isExpired}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isExpired ? (
                <>
                  <Timer className="w-3.5 h-3.5" />
                  <span>Hold Expired</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Pay ${totalAmount.toFixed(2)} with Baray</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full p-24 text-center text-sm font-semibold text-slate-500">
          Loading checkout…
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

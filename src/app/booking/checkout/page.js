"use client";
import { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Breadcrumb from "@/components/Breadcrumb";
import {
  getMyBookings,
  getBookingById,
  createBooking,
  cancelBooking,
  extendBooking,
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
  X,
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

function extractDriverLicenseNumber(value) {
  if (!value) return "";
  if (typeof value === "string") {
    return value === "[object Object]" ? "" : value;
  }
  if (typeof value === "object") {
    return value.idNumber || value.number || "";
  }
  return "";
}

function RequiredStar() {
  return <span className="text-rose-500 ml-0.5">*</span>;
}

const CHECKOUT_DRAFT_KEY = "dkh_checkout_form_draft";

function saveCheckoutDraft(draft, bId, cId) {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(draft);
    localStorage.setItem(CHECKOUT_DRAFT_KEY, raw);
    sessionStorage.setItem(CHECKOUT_DRAFT_KEY, raw);
    if (bId && bId !== "basket") {
      localStorage.setItem(`dkh_checkout_form_draft_${bId}`, raw);
      sessionStorage.setItem(`dkh_checkout_form_draft_${bId}`, raw);
    }
    if (cId) {
      localStorage.setItem(`dkh_checkout_form_draft_${cId}`, raw);
    }
  } catch (e) {
    console.warn("Could not save checkout draft", e);
  }
}

function loadCheckoutDraft(bId, cId) {
  if (typeof window === "undefined") return null;
  try {
    const keys = [];
    if (bId && bId !== "basket") keys.push(`dkh_checkout_form_draft_${bId}`);
    if (cId) keys.push(`dkh_checkout_form_draft_${cId}`);
    keys.push(CHECKOUT_DRAFT_KEY);

    for (const k of keys) {
      const stored = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not load checkout draft", e);
  }
  return null;
}

function clearCheckoutDraft(bId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CHECKOUT_DRAFT_KEY);
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
    if (bId) {
      localStorage.removeItem(`dkh_checkout_form_draft_${bId}`);
      sessionStorage.removeItem(`dkh_checkout_form_draft_${bId}`);
    }
  } catch (e) {}
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const carIdParam = searchParams.get("carId");
  const itemIdParam = searchParams.get("itemId");

  const {
    items,
    remainingHoldSeconds,
    isHoldExpired,
    resetHold,
    showToast,
    clearBasket,
    removeFromBasket,
  } = useBasket();

  // Find the exact single car item selected for checkout
  const targetBasketItem = useMemo(() => {
    if (!items || items.length === 0) return null;
    if (itemIdParam) {
      const found = items.find((i) => i.id === itemIdParam);
      if (found) return found;
    }
    if (carIdParam) {
      const found = items.find((i) => (i.car?._id || i.car?.id) === carIdParam);
      if (found) return found;
    }
    return items[0];
  }, [items, itemIdParam, carIdParam]);

  const [booking, setBooking] = useState(null);
  const [directCar, setDirectCar] = useState(() => {
    return targetBasketItem ? targetBasketItem.car : null;
  });
  const [loading, setLoading] = useState(() => {
    return !(bookingId === "basket" || (!bookingId && items.length > 0));
  });
  const [paying, setPaying] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Payment Cancelled / Failed Detection & Modal State
  const paymentStatusParam =
    searchParams.get("paymentStatus") ||
    searchParams.get("payment") ||
    searchParams.get("status");
  const isPaymentInterrupted =
    paymentStatusParam === "cancelled" ||
    paymentStatusParam === "failed" ||
    paymentStatusParam === "cancel" ||
    paymentStatusParam === "fail";
  const [showResumeModal, setShowResumeModal] = useState(() => Boolean(isPaymentInterrupted));

  useEffect(() => {
    if (isPaymentInterrupted) {
      setShowResumeModal(true);
    }
  }, [isPaymentInterrupted]);

  // Live Hold Countdown State
  const [remainingSeconds, setRemainingSeconds] = useState(900);
  const [isExpired, setIsExpired] = useState(false);

  // Driver Details & License Initialized with Saved Draft fallback
  const [driverName, setDriverName] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const draft = loadCheckoutDraft(bookingId, carIdParam);
      if (draft && draft.driverName !== undefined && draft.driverName !== "") {
        return draft.driverName;
      }
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored).name || "" : "";
    } catch {
      return "";
    }
  });
  const [driverPhone, setDriverPhone] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const draft = loadCheckoutDraft(bookingId, carIdParam);
      if (draft && draft.driverPhone !== undefined && draft.driverPhone !== "") {
        return draft.driverPhone;
      }
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored).phoneNumber || "" : "";
    } catch {
      return "";
    }
  });
  const [driverEmail, setDriverEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const draft = loadCheckoutDraft(bookingId, carIdParam);
      if (draft && draft.driverEmail !== undefined && draft.driverEmail !== "") {
        return draft.driverEmail;
      }
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored).email || "" : "";
    } catch {
      return "";
    }
  });
  const [driverLicenseNumber, setDriverLicenseNumber] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const draft = loadCheckoutDraft(bookingId, carIdParam);
      const draftDl = extractDriverLicenseNumber(draft?.driverLicenseNumber);
      if (draftDl) return draftDl;
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        const userDl = extractDriverLicenseNumber(u.driverLicense);
        if (userDl) return userDl;
        if (u.kid) return `KID-DL-${u.kid}`;
      }
      return "";
    } catch {
      return "";
    }
  });

  const [idType, setIdType] = useState(() => {
    if (typeof window === "undefined") return "Driver's License";
    const draft = loadCheckoutDraft(bookingId, carIdParam);
    return draft?.idType || "Driver's License";
  });

  const [dateOfBirth, setDateOfBirth] = useState(() => {
    if (typeof window === "undefined") return "";
    const draft = loadCheckoutDraft(bookingId, carIdParam);
    return draft?.dateOfBirth || "";
  });

  const [licenseFrontUploaded, setLicenseFrontUploaded] = useState(() => {
    if (typeof window === "undefined") return false;
    const draft = loadCheckoutDraft(bookingId, carIdParam);
    return Boolean(draft?.licenseFrontUploaded);
  });
  const [licenseBackUploaded, setLicenseBackUploaded] = useState(() => {
    if (typeof window === "undefined") return false;
    const draft = loadCheckoutDraft(bookingId, carIdParam);
    return Boolean(draft?.licenseBackUploaded);
  });
  const [frontFileName, setFrontFileName] = useState(() => {
    if (typeof window === "undefined") return "";
    const draft = loadCheckoutDraft(bookingId, carIdParam);
    return draft?.frontFileName || "";
  });
  const [backFileName, setBackFileName] = useState(() => {
    if (typeof window === "undefined") return "";
    const draft = loadCheckoutDraft(bookingId, carIdParam);
    return draft?.backFileName || "";
  });

  // Pickup & Logistics Initialized with Saved Draft fallback
  const [deliveryOption, setDeliveryOption] = useState(() => {
    if (typeof window === "undefined") return "branch";
    const draft = loadCheckoutDraft(bookingId, carIdParam);
    return draft?.deliveryOption || "branch";
  });
  const [pickupBranch, setPickupBranch] = useState(() => {
    if (typeof window === "undefined") return "Phnom Penh Airport Terminal Depot";
    const draft = loadCheckoutDraft(bookingId, carIdParam);
    return draft?.pickupBranch || "Phnom Penh Airport Terminal Depot";
  });
  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    if (typeof window === "undefined") return "";
    const draft = loadCheckoutDraft(bookingId, carIdParam);
    return draft?.deliveryAddress || "";
  });
  const [pickupTime, setPickupTime] = useState(() => {
    if (typeof window === "undefined") return "Anytime";
    const draft = loadCheckoutDraft(bookingId, carIdParam);
    return draft?.pickupTime || "Anytime";
  });
  const [returnTime, setReturnTime] = useState(() => {
    if (typeof window === "undefined") return "Anytime";
    const draft = loadCheckoutDraft(bookingId, carIdParam);
    return draft?.returnTime || "Anytime";
  });
  const [flightNumber, setFlightNumber] = useState(() => {
    if (typeof window === "undefined") return "";
    const draft = loadCheckoutDraft(bookingId, carIdParam);
    return draft?.flightNumber || "";
  });

  // Terms Agreement Initialized with Saved Draft fallback
  const [acceptedTerms, setAcceptedTerms] = useState(() => {
    if (typeof window === "undefined") return false;
    const draft = loadCheckoutDraft(bookingId, carIdParam);
    return Boolean(draft?.acceptedTerms);
  });

  // Flag to avoid race conditions when hydrating/restoring
  const isDraftRestoredRef = useRef(false);

  // Restore draft form inputs on mount or param change
  useEffect(() => {
    const draft = loadCheckoutDraft(bookingId, carIdParam);
    if (draft) {
      if (draft.driverName) setDriverName(draft.driverName);
      if (draft.driverPhone) setDriverPhone(draft.driverPhone);
      if (draft.driverEmail) setDriverEmail(draft.driverEmail);
      const restoredDl = extractDriverLicenseNumber(draft.driverLicenseNumber);
      if (restoredDl) setDriverLicenseNumber(restoredDl);
      if (draft.idType) setIdType(draft.idType);
      if (draft.dateOfBirth) setDateOfBirth(draft.dateOfBirth);
      if (draft.licenseFrontUploaded != null) setLicenseFrontUploaded(Boolean(draft.licenseFrontUploaded));
      if (draft.frontFileName) setFrontFileName(draft.frontFileName);
      if (draft.licenseBackUploaded != null) setLicenseBackUploaded(Boolean(draft.licenseBackUploaded));
      if (draft.backFileName) setBackFileName(draft.backFileName);
      if (draft.deliveryOption) setDeliveryOption(draft.deliveryOption);
      if (draft.pickupBranch) setPickupBranch(draft.pickupBranch);
      if (draft.deliveryAddress) setDeliveryAddress(draft.deliveryAddress);
      if (draft.pickupTime) setPickupTime(draft.pickupTime);
      if (draft.returnTime) setReturnTime(draft.returnTime);
      if (draft.flightNumber) setFlightNumber(draft.flightNumber);
      if (draft.acceptedTerms != null) setAcceptedTerms(Boolean(draft.acceptedTerms));
    }
    isDraftRestoredRef.current = true;
  }, [bookingId, carIdParam]);

  // Auto-save form inputs so user never loses their filled data
  useEffect(() => {
    if (!isDraftRestoredRef.current) return;
    const currentDraft = {
      driverName,
      driverPhone,
      driverEmail,
      driverLicenseNumber,
      idType,
      dateOfBirth,
      licenseFrontUploaded,
      frontFileName,
      licenseBackUploaded,
      backFileName,
      deliveryOption,
      pickupBranch,
      deliveryAddress,
      pickupTime,
      returnTime,
      flightNumber,
      acceptedTerms,
      savedAt: Date.now(),
    };
    saveCheckoutDraft(currentDraft, bookingId, carIdParam);
  }, [
    driverName,
    driverPhone,
    driverEmail,
    driverLicenseNumber,
    idType,
    dateOfBirth,
    licenseFrontUploaded,
    frontFileName,
    licenseBackUploaded,
    backFileName,
    deliveryOption,
    pickupBranch,
    deliveryAddress,
    pickupTime,
    returnTime,
    flightNumber,
    acceptedTerms,
    bookingId,
    carIdParam,
  ]);

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
              const customerDl = extractDriverLicenseNumber(c.driverLicense);
              if (customerDl && !driverLicenseNumber) setDriverLicenseNumber(customerDl);
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
    targetBasketItem?.car ||
    null;

  const carTitle =
    activeCar?.brand || activeCar?.make
      ? `${activeCar?.brand || activeCar?.make} ${activeCar?.modelName || activeCar?.model || ""}`.trim()
      : activeCar?.name ||
        activeCar?.title ||
        activeCar?.modelName ||
        "Toyota Corolla Cross";

  const start = useMemo(() => {
    if (booking?.startDate) return new Date(booking.startDate);
    if (targetBasketItem?.startDate) return new Date(targetBasketItem.startDate);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }, [booking, targetBasketItem]);

  const end = useMemo(() => {
    if (booking?.endDate) return new Date(booking.endDate);
    if (targetBasketItem?.endDate) return new Date(targetBasketItem.endDate);
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d;
  }, [booking, targetBasketItem]);

  const totalDays = booking?.totalDays || Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const dailyRate = activeCar?.pricePerDay || 35;
  const carSubtotal = dailyRate * totalDays;
  const itemAddOnsTotal = targetBasketItem?.addOnsTotal || 0;

  // Single source of truth: Database booking.totalPrice or single car subtotal + add-ons
  const totalAmount =
    booking?.totalPrice != null
      ? Number(booking.totalPrice)
      : carSubtotal + itemAddOnsTotal;

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
    clearCheckoutDraft(booking?._id);
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

  const [extending, setExtending] = useState(false);

  const handleModifyDurationFromCheckout = async (daysChange) => {
    const token = getToken();
    if (!token) return;

    const currentStart = start ? new Date(start) : new Date();
    const currentEnd = end ? new Date(end) : new Date();
    const newEnd = new Date(currentEnd);
    newEnd.setDate(newEnd.getDate() + daysChange);

    // Validate minimum duration of 1 day
    const diffDays = Math.ceil((newEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 1) {
      showToast("Minimum rental duration is 1 day.", "warning");
      return;
    }

    setExtending(true);
    try {
      if (booking?._id) {
        const res = await extendBooking(booking._id, { newEndDate: newEnd.toISOString() }, token);
        if (res.success && res.booking) {
          setBooking(res.booking);
          if (daysChange < 0) {
            showToast(`Rental reduced by ${Math.abs(daysChange)} day. New total: ${res.booking.totalDays} days.`, "success");
          } else {
            showToast(`Rental extended by ${daysChange} ${daysChange === 1 ? 'day' : 'days'}! Total: ${res.booking.totalDays} days.`, "success");
          }
          if (res.holdExpiresAt) {
            const expTime = new Date(res.holdExpiresAt).getTime();
            const diff = Math.max(0, Math.floor((expTime - Date.now()) / 1000));
            setRemainingSeconds(diff);
            setIsExpired(false);
          }
        } else {
          showToast(res.message || "Could not update booking dates.", "error");
        }
      }
    } catch (err) {
      showToast(err?.message || "Failed to update booking dates", "error");
    } finally {
      setExtending(false);
    }
  };

  const handleExtendFromCheckout = (daysToAdd) => handleModifyDurationFromCheckout(daysToAdd);
  const handleDecreaseFromCheckout = (daysToSubtract = 1) => handleModifyDurationFromCheckout(-daysToSubtract);

  const handleFileUpload = (side, file) => {
    if (!file) return;
    setError(null);
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

  const handleRemovePhoto = (side, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (side === "front") {
      setLicenseFrontUploaded(false);
      setFrontFileName("");
      showToast("Front document photo removed");
    } else {
      setLicenseBackUploaded(false);
      setBackFileName("");
      showToast("Back document photo removed");
    }
  };

  const isDriverComplete = Boolean(
    driverName.trim() &&
      driverPhone.trim() &&
      driverEmail.trim() &&
      dateOfBirth.trim() &&
      idType.trim() &&
      driverLicenseNumber.trim() &&
      licenseFrontUploaded &&
      licenseBackUploaded
  );

  async function handlePay() {
    if (isExpired) {
      setError("Reservation hold has expired. Please re-reserve to continue.");
      return;
    }

    setAttemptedSubmit(true);

    const checks = [
      { valid: Boolean(driverName.trim()), message: "Please enter the driver's full name.", targetId: "driver-info" },
      { valid: Boolean(driverPhone.trim()), message: "Please enter a phone number.", targetId: "driver-info" },
      { valid: Boolean(driverEmail.trim()), message: "Please enter an email address.", targetId: "driver-info" },
      { valid: Boolean(dateOfBirth.trim()), message: "Please enter your date of birth.", targetId: "driver-info" },
      { valid: Boolean(idType.trim()), message: "Please select a document type.", targetId: "driver-info" },
      { valid: Boolean(driverLicenseNumber.trim()), message: "Please enter your document number.", targetId: "driver-info" },
      { valid: licenseFrontUploaded, message: "Please upload the front photo of your ID.", targetId: "id-photos-section" },
      { valid: licenseBackUploaded, message: "Please upload the back photo of your ID.", targetId: "id-photos-section" },
      { valid: acceptedTerms, message: "Please agree to the rental terms before proceeding.", targetId: "payment-section" },
    ];

    const failed = checks.find((c) => !c.valid);
    if (failed) {
      setShowResumeModal(false);
      setError(failed.message);
      showToast?.(failed.message, "error");
      document.getElementById(failed.targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
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
          setShowResumeModal(false);
          setError(createRes.message || "Could not reserve vehicle. Please check date availability.");
          setPaying(false);
          return;
        }
      }

      if (!targetBookingId) {
        setShowResumeModal(false);
        setError("Booking reference not found. Please pick your dates first.");
        setPaying(false);
        return;
      }

      // Persist the latest checkout form state right before redirecting to Baray
      const currentDraft = {
        driverName,
        driverPhone,
        driverEmail,
        driverLicenseNumber,
        idType,
        dateOfBirth,
        licenseFrontUploaded,
        frontFileName,
        licenseBackUploaded,
        backFileName,
        deliveryOption,
        pickupBranch,
        deliveryAddress,
        pickupTime,
        returnTime,
        flightNumber,
        acceptedTerms,
        savedAt: Date.now(),
      };
      saveCheckoutDraft(currentDraft, targetBookingId, activeCar?._id || carIdParam);

      const clientOrigin = window.location.origin;
      const data = await checkoutPayment(
        {
          bookingId: targetBookingId,
          successUrl: `${clientOrigin}/booking/success?bookingId=${targetBookingId}&paid=true`,
          cancelUrl: `${clientOrigin}/booking/checkout?bookingId=${targetBookingId}&paymentStatus=cancelled`,
          failureUrl: `${clientOrigin}/booking/checkout?bookingId=${targetBookingId}&paymentStatus=failed`,
        },
        token
      );

      const paymentUrl =
        data.paymentUrl || data.checkout?.paymentUrl || data.data?.paymentUrl;

      if (data.success && paymentUrl) {
        if (targetBasketItem?.id) {
          removeFromBasket(targetBasketItem.id);
        } else {
          clearBasket();
        }
        // Redirect customer directly to Baray checkout gateway
        window.location.href = paymentUrl;
        return;
      } else {
        setShowResumeModal(false);
        setError(data.message || "Failed to initialize Baray payment gateway. Please try again.");
        setPaying(false);
      }
    } catch (err) {
      console.error("Payment checkout error:", err);
      setShowResumeModal(false);
      setError(err?.message || "An unexpected error occurred while connecting to Baray.");
      setPaying(false);
    }
  }

  async function handleContinuePayment() {
    await handlePay();
  }

  const targetCarId =
    carIdParam ||
    booking?.car?._id ||
    booking?.car?.id ||
    targetBasketItem?.car?._id ||
    targetBasketItem?.car?.id;

  const carDetailsUrl = targetCarId ? `/booking?carId=${targetCarId}` : "/";

  const handleBackToBooking = () => {
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
        <main
          className="max-w-6xl mx-auto px-4 py-6 sm:py-8"
          aria-busy="true"
          aria-label="Loading checkout"
        >
          <Breadcrumb
            className="mb-5"
            items={[
              { label: "Home", href: "/" },
              { label: carTitle || "Booking", href: carDetailsUrl },
              { label: "Checkout" },
            ]}
          />
          <div className="h-11 rounded-xl skeleton-shimmer mb-6" />
          <div className="mb-6 space-y-2">
            <div className="h-7 w-36 rounded skeleton-shimmer" />
            <div className="h-4 w-60 rounded skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <div className="h-6 w-40 rounded skeleton-shimmer" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl skeleton-shimmer" />
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="h-14 rounded-xl skeleton-shimmer" />
                <div className="h-14 rounded-xl skeleton-shimmer" />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="h-6 w-24 rounded skeleton-shimmer" />
              <div className="h-16 rounded-xl skeleton-shimmer" />
              <div className="h-24 rounded-xl skeleton-shimmer" />
              <div className="h-11 rounded-xl skeleton-shimmer" />
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <Breadcrumb
          className="mb-5"
          items={[
            { label: "Home", href: "/" },
            { label: carTitle || "Booking", href: carDetailsUrl },
            { label: "Checkout" },
          ]}
        />

        {/* Interrupted Payment Banner */}
        {isPaymentInterrupted && !showResumeModal && !isExpired && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Payment incomplete. Hold active for{" "}
                <strong className="font-mono">{formatSeconds(remainingSeconds)}</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowResumeModal(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs cursor-pointer shrink-0"
            >
              Resume payment
            </button>
          </div>
        )}

        {/* Hold Status Bar */}
        {isExpired ? (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-rose-900">Reservation expired</h3>
                <p className="text-xs text-rose-700">Your 15-minute hold ended.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleReReserve}
                disabled={renewing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{renewing ? "Holding…" : "Re-reserve"}</span>
              </button>
              <button
                type="button"
                onClick={() => router.push(activeCar?._id ? `/booking?carId=${activeCar._id}` : "/")}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold text-xs cursor-pointer"
              >
                Back to car
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`mb-6 px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs border ${
              remainingSeconds <= 60
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : remainingSeconds <= 180
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-slate-100 border-slate-200 text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 shrink-0" />
              <span>Hold time remaining:</span>
              <strong className="font-mono text-sm font-bold">{formatSeconds(remainingSeconds)}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReReserve}
                disabled={renewing || cancelling}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-semibold border border-slate-200 cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" />
                <span>+15m</span>
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelling || renewing}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-600 rounded-lg font-semibold border border-slate-200 hover:border-rose-200 cursor-pointer disabled:opacity-50"
              >
                {cancelling ? "Releasing…" : "Cancel hold"}
              </button>
            </div>
          </div>
        )}

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Checkout</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter driver details to complete your booking
          </p>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* Left: Driver Details Form */}
          <div
            id="driver-info"
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Driver details</h2>
                <p className="text-xs text-slate-500">Must match your ID at pick-up</p>
              </div>
              {isDriverComplete && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete
                </span>
              )}
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full name
                  <RequiredStar />
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Sokha Kheang"
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border bg-white focus:outline-hidden ${
                    attemptedSubmit && !driverName.trim()
                      ? "border-rose-400 focus:border-rose-500"
                      : "border-slate-200 focus:border-blue-600"
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phone number
                  <RequiredStar />
                </label>
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="+855 12 345 678"
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border bg-white focus:outline-hidden ${
                    attemptedSubmit && !driverPhone.trim()
                      ? "border-rose-400 focus:border-rose-500"
                      : "border-slate-200 focus:border-blue-600"
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email
                  <RequiredStar />
                </label>
                <input
                  type="email"
                  value={driverEmail}
                  onChange={(e) => setDriverEmail(e.target.value)}
                  placeholder="driver@example.com"
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border bg-white focus:outline-hidden ${
                    attemptedSubmit && !driverEmail.trim()
                      ? "border-rose-400 focus:border-rose-500"
                      : "border-slate-200 focus:border-blue-600"
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date of birth
                  <RequiredStar />
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className={`w-full text-xs px-3.5 py-2.5 rounded-xl border bg-white focus:outline-hidden text-slate-700 ${
                    attemptedSubmit && !dateOfBirth.trim()
                      ? "border-rose-400 focus:border-rose-500"
                      : "border-slate-200 focus:border-blue-600"
                  }`}
                  required
                />
              </div>
            </div>

            {/* Identification */}
            <div className="pt-5 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Identification
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Document type
                    <RequiredStar />
                  </label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border bg-white focus:outline-hidden cursor-pointer ${
                      attemptedSubmit && !idType.trim()
                        ? "border-rose-400 focus:border-rose-500"
                        : "border-slate-200 focus:border-blue-600"
                    }`}
                    required
                  >
                    <option value="Driver's License">Driver&apos;s License</option>
                    <option value="International Driving Permit">International Driving Permit</option>
                    <option value="National ID Card">National ID Card</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Document number
                    <RequiredStar />
                  </label>
                  <input
                    type="text"
                    value={driverLicenseNumber}
                    onChange={(e) => setDriverLicenseNumber(e.target.value)}
                    placeholder="KH-DL-9874218"
                    className={`w-full text-xs px-3.5 py-2.5 rounded-xl border bg-white focus:outline-hidden font-mono ${
                      attemptedSubmit && !driverLicenseNumber.trim()
                        ? "border-rose-400 focus:border-rose-500"
                        : "border-slate-200 focus:border-blue-600"
                    }`}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Required Document Photos */}
            <div id="id-photos-section" className="pt-5 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  ID photos
                  <RequiredStar />
                </h3>
                <span className="text-[11px] text-slate-400">JPG, PNG, WebP</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {licenseFrontUploaded ? (
                  <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 text-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <div className="text-xs font-semibold text-emerald-900">Front attached</div>
                    <div className="text-[11px] text-emerald-700 truncate font-mono mt-0.5">
                      {frontFileName || "front.jpg"}
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-3 text-[11px] font-semibold">
                      <label className="text-blue-600 hover:underline cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload("front", e.target.files[0])}
                        />
                        Replace
                      </label>
                      <button
                        type="button"
                        onClick={(e) => handleRemovePhoto("front", e)}
                        className="text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    className={`border border-dashed rounded-xl p-4 text-center cursor-pointer block ${
                      attemptedSubmit && !licenseFrontUploaded
                        ? "border-rose-400 bg-rose-50/40 hover:border-rose-500"
                        : "border-slate-300 hover:border-blue-500 bg-slate-50/50"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload("front", e.target.files[0])}
                    />
                    <UploadCloud className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                    <div className="text-xs font-semibold text-slate-700">
                      Front of ID
                      <RequiredStar />
                    </div>
                  </label>
                )}

                {licenseBackUploaded ? (
                  <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 text-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <div className="text-xs font-semibold text-emerald-900">Back attached</div>
                    <div className="text-[11px] text-emerald-700 truncate font-mono mt-0.5">
                      {backFileName || "back.jpg"}
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-3 text-[11px] font-semibold">
                      <label className="text-blue-600 hover:underline cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload("back", e.target.files[0])}
                        />
                        Replace
                      </label>
                      <button
                        type="button"
                        onClick={(e) => handleRemovePhoto("back", e)}
                        className="text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label
                    className={`border border-dashed rounded-xl p-4 text-center cursor-pointer block ${
                      attemptedSubmit && !licenseBackUploaded
                        ? "border-rose-400 bg-rose-50/40 hover:border-rose-500"
                        : "border-slate-300 hover:border-blue-500 bg-slate-50/50"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload("back", e.target.files[0])}
                    />
                    <UploadCloud className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                    <div className="text-xs font-semibold text-slate-700">
                      Back of ID
                      <RequiredStar />
                    </div>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Right: Sticky Summary */}
          <div className="sticky top-24 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Summary
            </h3>

            {/* Car Preview */}
            <div className="flex items-center gap-3">
              <div className="w-20 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                <img
                  src={getCarPhotoUrl(activeCar?.photos?.[0])}
                  alt={carTitle}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-slate-900 truncate">{carTitle}</h4>
                <p className="text-xs text-slate-500 truncate">
                  {activeCar?.category || "Sedan"} · {activeCar?.transmission || "Automatic"}
                </p>
              </div>
            </div>

            {/* Dates & Quick Adjust */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Dates</span>
                <span className="font-semibold text-slate-900">
                  {start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} –{" "}
                  {end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {" "}({totalDays}d)
                </span>
              </div>

              {booking?._id && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {extending ? "Updating…" : "Adjust days"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDecreaseFromCheckout(1)}
                      disabled={extending || totalDays <= 1}
                      className="px-2 py-0.5 rounded bg-white border border-slate-200 text-rose-600 font-semibold text-[11px] cursor-pointer disabled:opacity-30"
                    >
                      -1d
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtendFromCheckout(1)}
                      disabled={extending}
                      className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:border-blue-500 font-semibold text-[11px] cursor-pointer disabled:opacity-50"
                    >
                      +1d
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExtendFromCheckout(2)}
                      disabled={extending}
                      className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:border-blue-500 font-semibold text-[11px] cursor-pointer disabled:opacity-50"
                    >
                      +2d
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>${dailyRate}/day × {totalDays}d</span>
                <span className="font-semibold text-slate-900">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Insurance &amp; 250 km/day</span>
                <span className="font-medium text-emerald-700">Included</span>
              </div>
              <div className="flex justify-between">
                <span>Refundable deposit</span>
                <span className="font-medium text-slate-800">$100.00</span>
              </div>
              <div className="h-px bg-slate-200 my-2" />
              <div className="flex justify-between items-baseline text-slate-900">
                <span className="font-bold text-sm">Total due</span>
                <span className="text-xl font-bold">${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Terms */}
            <label
              id="payment-section"
              className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-700 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
              />
              <span className="text-[11px] leading-relaxed">
                I confirm my details and agree to the rental terms and 24h free cancellation.
              </span>
            </label>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Pay CTA */}
            <button
              type="button"
              onClick={handlePay}
              disabled={paying || isExpired}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isExpired ? (
                <span>Hold expired</span>
              ) : paying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spinner" />
                  <span>Connecting…</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay ${totalAmount.toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center space-y-2">
              <p className="text-[11px] text-slate-400">
                KHQR (Bakong, ABA, Wing) · Visa · Mastercard
              </p>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelling || paying}
                className="text-xs font-medium text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"
              >
                {cancelling ? "Releasing…" : "Cancel reservation"}
              </button>
            </div>
          </div>
        </div>

        {/* Payment Resume Modal */}
        {showResumeModal && !isExpired && activeCar && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="payment-resume-title"
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl border border-slate-200"
            >
              <button
                type="button"
                onClick={() => setShowResumeModal(false)}
                aria-label="Close"
                className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden bg-slate-100">
                <img
                  src={getCarPhotoUrl(activeCar?.photos?.[0] || activeCar?.photo)}
                  alt={carTitle}
                  className="h-full w-full object-cover"
                />
              </div>

              <h2 id="payment-resume-title" className="text-lg font-bold text-slate-900">
                Payment incomplete
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {carTitle} · Hold expires in <span className="font-mono font-semibold text-slate-900">{formatSeconds(remainingSeconds)}</span>
              </p>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleContinuePayment}
                  disabled={paying || isExpired}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-3 text-xs font-semibold text-white cursor-pointer disabled:opacity-60"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>{paying ? "Connecting…" : `Continue payment ($${totalAmount.toFixed(2)})`}</span>
                </button>
              </div>
            </div>
          </div>
        )}
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

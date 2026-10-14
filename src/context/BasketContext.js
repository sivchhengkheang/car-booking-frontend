"use client";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getMyBookings, cancelBooking } from "@/lib/api";

export const AVAILABLE_ADDONS = [
  {
    id: "cdw",
    name: "Full CDW Protection",
    desc: "Zero-excess collision damage waiver & 24/7 roadside assistance",
    price: 15,
    perDay: true,
    icon: "🛡️",
    badge: "Recommended",
  },
  {
    id: "driver",
    name: "Professional Chauffeur",
    desc: "Licensed English-speaking driver for 10 hours/day",
    price: 30,
    perDay: true,
    icon: "👨‍✈️",
  },
  {
    id: "child_seat",
    name: "Child Safety Seat",
    desc: "ISOFIX certified booster or infant car seat",
    price: 8,
    perDay: true,
    icon: "👶",
  },
  {
    id: "gps",
    name: "Offline GPS Navigator",
    desc: "Garmin device preloaded with Cambodia road maps",
    price: 5,
    perDay: true,
    icon: "🧭",
  },
  {
    id: "extra_driver",
    name: "Additional Driver",
    desc: "Authorizes a secondary driver with full insurance",
    price: 12,
    perDay: false,
    icon: "👥",
  },
  {
    id: "airport_delivery",
    name: "Airport Meet & Greet",
    desc: "Vehicle hand-over right outside Phnom Penh / Siem Reap terminal",
    price: 15,
    perDay: false,
    icon: "✈️",
  },
  {
    id: "prepaid_fuel",
    name: "Pre-paid Full Fuel Tank",
    desc: "Return car at any fuel level with no refueling surcharge",
    price: 40,
    perDay: false,
    icon: "⛽",
  },
];

const HOLD_DURATION_SECONDS = 15 * 60; // 15 minutes hold

const BasketContext = createContext(null);

export function BasketProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeHoldBooking, setActiveHoldBooking] = useState(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [remainingHoldSeconds, setRemainingHoldSeconds] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null); // { code, discountPercent, discountAmount }
  const [wishlist, setWishlist] = useState([]);
  const [compareList, setCompareList] = useState([]);
  const [toast, setToast] = useState(null);

  // Refresh active reservation hold from backend
  const refreshActiveHold = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("kid_access_token");
    if (!token) {
      setActiveHoldBooking(null);
      return;
    }

    try {
      const res = await getMyBookings(token);
      if (res && res.success && Array.isArray(res.bookings)) {
        const nowTime = Date.now();
        const pendingHold = res.bookings.find(
          (b) =>
            (b.status === "PENDING_PAYMENT" || b.status === "PROVISIONAL") &&
            b.holdExpiresAt &&
            new Date(b.holdExpiresAt).getTime() > nowTime
        );

        if (pendingHold) {
          setActiveHoldBooking(pendingHold);
          const expTime = new Date(pendingHold.holdExpiresAt).getTime();
          setHoldExpiresAt(expTime);
          setRemainingHoldSeconds(Math.max(0, Math.floor((expTime - nowTime) / 1000)));
        } else {
          setActiveHoldBooking(null);
        }
      }
    } catch {
      // silently ignore network errors
    }
  }, []);

  // Initialize from localStorage and sync active hold
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedItems = localStorage.getItem("dkh_basket_items");
      if (storedItems) setItems(JSON.parse(storedItems));

      const storedHold = localStorage.getItem("dkh_basket_hold");
      if (storedHold) setHoldExpiresAt(Number(storedHold));

      const storedWishlist = localStorage.getItem("dkh_wishlist");
      if (storedWishlist) setWishlist(JSON.parse(storedWishlist));

      const storedPromo = localStorage.getItem("dkh_promo");
      if (storedPromo) setAppliedPromo(JSON.parse(storedPromo));
    } catch (e) {
      console.error("Failed to load local storage state:", e);
    }

    refreshActiveHold();

    const handleFocusOrPageshow = () => {
      refreshActiveHold();
    };

    window.addEventListener("focus", handleFocusOrPageshow);
    window.addEventListener("pageshow", handleFocusOrPageshow);
    return () => {
      window.removeEventListener("focus", handleFocusOrPageshow);
      window.removeEventListener("pageshow", handleFocusOrPageshow);
    };
  }, [refreshActiveHold]);

  // Sync items to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("dkh_basket_items", JSON.stringify(items));
    } catch (e) {}
  }, [items]);

  // Sync wishlist to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("dkh_wishlist", JSON.stringify(wishlist));
    } catch (e) {}
  }, [wishlist]);

  // Hold Timer tick (supports both active backend reservation holds and local basket holds)
  useEffect(() => {
    const hasHold =
      Boolean(activeHoldBooking) || (Boolean(holdExpiresAt) && items.length > 0);
    if (!hasHold || !holdExpiresAt) {
      setRemainingHoldSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((holdExpiresAt - now) / 1000));
      setRemainingHoldSeconds(diff);
      if (diff <= 0) {
        setActiveHoldBooking(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt, items.length, activeHoldBooking]);

  // Release active reservation hold
  const releaseActiveHold = useCallback(async () => {
    if (!activeHoldBooking) return false;
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") || sessionStorage.getItem("kid_access_token")
        : null;
    try {
      await cancelBooking(
        activeHoldBooking._id,
        "Customer released hold from basket",
        token
      );
      setActiveHoldBooking(null);
      setRemainingHoldSeconds(0);
      setHoldExpiresAt(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("dkh_basket_hold");
      }
      return true;
    } catch (err) {
      console.error("Failed to release active hold:", err);
      return false;
    }
  }, [activeHoldBooking]);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => {
      setToast((curr) => (curr && curr.msg === msg ? null : curr));
    }, 3500);
  }, []);

  const resetHold = useCallback(() => {
    const newExpiresAt = Date.now() + HOLD_DURATION_SECONDS * 1000;
    setHoldExpiresAt(newExpiresAt);
    if (typeof window !== "undefined") {
      localStorage.setItem("dkh_basket_hold", String(newExpiresAt));
    }
    setRemainingHoldSeconds(HOLD_DURATION_SECONDS);
  }, []);

  const addToBasket = useCallback(
    ({ car, startDate, endDate, addOns = [] }) => {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const totalDays = Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
      const pricePerDay = car.pricePerDay || 35;
      const carTotal = pricePerDay * totalDays;

      const addOnsTotal = addOns.reduce((acc, a) => {
        return acc + (a.perDay ? a.price * totalDays : a.price);
      }, 0);

      const newItem = {
        id: `${car._id}_${Date.now()}`,
        car,
        startDate: s.toISOString(),
        endDate: e.toISOString(),
        totalDays,
        pricePerDay,
        carTotal,
        addOns,
        addOnsTotal,
        itemTotal: carTotal + addOnsTotal,
      };

      setItems((prev) => {
        // If car already in basket for same dates, update it; otherwise append
        const filtered = prev.filter(
          (p) => !(p.car._id === car._id && p.startDate === newItem.startDate)
        );
        return [...filtered, newItem];
      });

      // Reset or start hold timer
      resetHold();
      setIsDrawerOpen(true);
      showToast(`Added ${car.brand || car.make || "Vehicle"} ${car.modelName || car.model || ""} to basket!`);
    },
    [resetHold, showToast]
  );

  const removeFromBasket = useCallback(
    (itemId) => {
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== itemId);
        if (next.length === 0) {
          setHoldExpiresAt(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("dkh_basket_hold");
          }
        }
        return next;
      });
      showToast("Vehicle removed from basket", "info");
    },
    [showToast]
  );

  const updateItemAddOns = useCallback((itemId, newAddOns) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const addOnsTotal = newAddOns.reduce((acc, a) => {
          return acc + (a.perDay ? a.price * item.totalDays : a.price);
        }, 0);
        return {
          ...item,
          addOns: newAddOns,
          addOnsTotal,
          itemTotal: item.carTotal + addOnsTotal,
        };
      })
    );
  }, []);

  const clearBasket = useCallback(() => {
    setItems([]);
    setHoldExpiresAt(null);
    setAppliedPromo(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("dkh_basket_items");
      localStorage.removeItem("dkh_basket_hold");
      localStorage.removeItem("dkh_promo");
    }
  }, []);

  const applyPromoCode = useCallback(
    (code) => {
      const clean = (code || "").trim().toUpperCase();
      if (clean === "DRIVEKH10") {
        const promo = { code: clean, percent: 10, label: "10% Off Special" };
        setAppliedPromo(promo);
        if (typeof window !== "undefined") localStorage.setItem("dkh_promo", JSON.stringify(promo));
        showToast("Promo code applied: 10% discount!");
        return { success: true };
      }
      if (clean === "WELCOME20") {
        const promo = { code: clean, amount: 20, label: "$20 Welcome Voucher" };
        setAppliedPromo(promo);
        if (typeof window !== "undefined") localStorage.setItem("dkh_promo", JSON.stringify(promo));
        showToast("Promo code applied: $20 discount!");
        return { success: true };
      }
      if (clean === "KHQRVIP") {
        const promo = { code: clean, percent: 15, label: "15% Baray VIP Discount" };
        setAppliedPromo(promo);
        if (typeof window !== "undefined") localStorage.setItem("dkh_promo", JSON.stringify(promo));
        showToast("Promo code applied: 15% discount!");
        return { success: true };
      }
      showToast("Invalid promo code. Try DRIVEKH10 or WELCOME20", "error");
      return { success: false, message: "Invalid promo code" };
    },
    [showToast]
  );

  const removePromoCode = useCallback(() => {
    setAppliedPromo(null);
    if (typeof window !== "undefined") localStorage.removeItem("dkh_promo");
    showToast("Promo code removed", "info");
  }, [showToast]);

  const toggleWishlist = useCallback(
    (car) => {
      setWishlist((prev) => {
        const exists = prev.some((c) => (c._id || c.id) === (car._id || car.id));
        if (exists) {
          showToast(`Removed from saved cars`, "info");
          return prev.filter((c) => (c._id || c.id) !== (car._id || car.id));
        } else {
          showToast(`Saved to wishlist!`);
          return [...prev, car];
        }
      });
    },
    [showToast]
  );

  const isWishlisted = useCallback(
    (carId) => wishlist.some((c) => (c._id || c.id) === carId),
    [wishlist]
  );

  const saveForLater = useCallback(
    (itemId) => {
      const itemToSave = items.find((i) => i.id === itemId);
      if (itemToSave && itemToSave.car) {
        toggleWishlist(itemToSave.car);
        removeFromBasket(itemId);
        showToast(`Moved ${itemToSave.car.brand || "vehicle"} to Saved Cars!`);
      }
    },
    [items, removeFromBasket, toggleWishlist, showToast]
  );

  const toggleCompare = useCallback(
    (car) => {
      setCompareList((prev) => {
        const exists = prev.some((c) => (c._id || c.id) === (car._id || car.id));
        if (exists) {
          showToast("Removed from comparison", "info");
          return prev.filter((c) => (c._id || c.id) !== (car._id || car.id));
        }
        if (prev.length >= 3) {
          showToast("You can compare up to 3 vehicles at once", "error");
          return prev;
        }
        showToast("Added to side-by-side comparison");
        return [...prev, car];
      });
    },
    [showToast]
  );

  const isInCompare = useCallback(
    (carId) => compareList.some((c) => (c._id || c.id) === carId),
    [compareList]
  );

  // Financial calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, i) => acc + i.carTotal, 0);
  }, [items]);

  const addOnsTotal = useMemo(() => {
    return items.reduce((acc, i) => acc + i.addOnsTotal, 0);
  }, [items]);

  const serviceFee = useMemo(() => {
    return items.length > 0 ? 12 : 0; // standard platform fee
  }, [items]);

  const discountTotal = useMemo(() => {
    if (!appliedPromo) return 0;
    const base = subtotal + addOnsTotal;
    if (appliedPromo.percent) {
      return (base * appliedPromo.percent) / 100;
    }
    if (appliedPromo.amount) {
      return Math.min(base, appliedPromo.amount);
    }
    return 0;
  }, [appliedPromo, subtotal, addOnsTotal]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal + addOnsTotal + serviceFee - discountTotal);
  }, [subtotal, addOnsTotal, serviceFee, discountTotal]);

  const effectiveItemCount =
    items.length > 0 ? items.length : activeHoldBooking ? 1 : 0;

  const value = {
    items,
    itemCount: effectiveItemCount,
    activeHoldBooking,
    refreshActiveHold,
    releaseActiveHold,
    isDrawerOpen,
    openDrawer: () => setIsDrawerOpen(true),
    closeDrawer: () => setIsDrawerOpen(false),
    toggleDrawer: () => setIsDrawerOpen((v) => !v),
    addToBasket,
    removeFromBasket,
    saveForLater,
    updateItemAddOns,
    clearBasket,
    holdExpiresAt,
    remainingHoldSeconds,
    isHoldExpired: remainingHoldSeconds === 0 && items.length > 0,
    resetHold,
    promoCode,
    setPromoCode,
    appliedPromo,
    applyPromoCode,
    removePromoCode,
    subtotal,
    addOnsTotal,
    serviceFee,
    discountTotal,
    grandTotal,
    wishlist,
    toggleWishlist,
    isWishlisted,
    compareList,
    toggleCompare,
    isInCompare,
    clearCompare: () => setCompareList([]),
    toast,
    showToast,
  };

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket() {
  const context = useContext(BasketContext);
  if (!context) {
    throw new Error("useBasket must be used within a BasketProvider");
  }
  return context;
}

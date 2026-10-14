"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBasket, AVAILABLE_ADDONS } from "@/context/BasketContext";
import { getCarPhotoUrl } from "@/lib/api";
import {
  Clock,
  ArrowRight,
  X,
  Trash2,
  Calendar,
  MapPin,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

function formatSeconds(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function BasketDrawer() {
  const router = useRouter();
  const {
    items,
    itemCount,
    activeHoldBooking,
    releaseActiveHold,
    isDrawerOpen,
    closeDrawer,
    removeFromBasket,
    updateItemAddOns,
    remainingHoldSeconds,
    isHoldExpired,
    resetHold,
    appliedPromo,
    applyPromoCode,
    removePromoCode,
    subtotal,
    addOnsTotal,
    serviceFee,
    discountTotal,
    grandTotal,
    showToast,
  } = useBasket();

  const [inputCode, setInputCode] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [releasing, setReleasing] = useState(false);

  if (!isDrawerOpen) return null;

  const isUrgent = remainingHoldSeconds > 0 && remainingHoldSeconds < 120; // under 2 mins = red
  const isWarning = remainingHoldSeconds >= 120 && remainingHoldSeconds < 300; // under 5 mins = amber

  const handleApplyPromo = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    applyPromoCode(inputCode);
    setInputCode("");
  };

  const handleProceedToCheckout = () => {
    closeDrawer();
    if (activeHoldBooking) {
      router.push(`/booking/checkout?bookingId=${activeHoldBooking._id}`);
      return;
    }
    if (items.length > 0) {
      const first = items[0];
      router.push(
        `/booking/checkout?bookingId=basket&carId=${first.car._id || first.car.id}`
      );
    }
  };

  const handleReleaseHold = async () => {
    setReleasing(true);
    try {
      const success = await releaseActiveHold();
      if (success) {
        if (showToast) {
          showToast("Reservation hold released. Car is now available.", "info");
        }
      }
    } finally {
      setReleasing(false);
    }
  };

  const toggleItemAddon = (item, addon) => {
    const existing = item.addOns || [];
    const hasAddon = existing.some((a) => a.id === addon.id);
    let updated;
    if (hasAddon) {
      updated = existing.filter((a) => a.id !== addon.id);
    } else {
      updated = [...existing, addon];
    }
    updateItemAddOns(item.id, updated);
  };

  const hasContent = Boolean(activeHoldBooking) || items.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={closeDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col border-l border-gray-200">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🛒</span>
              <div>
                <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  Trip &amp; Reservation
                  {itemCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 font-semibold border border-blue-400/30">
                      {itemCount} {itemCount === 1 ? "vehicle" : "vehicles"}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-slate-400">
                  {remainingHoldSeconds > 0
                    ? "Active 15-minute checkout hold"
                    : "DriveKH Instant Reservation"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {remainingHoldSeconds > 0 && (
                <span
                  className={`font-mono text-xs font-bold px-2.5 py-1 rounded-full border ${
                    isUrgent
                      ? "bg-rose-500/20 border-rose-400 text-rose-300 animate-pulse"
                      : isWarning
                      ? "bg-amber-500/20 border-amber-400 text-amber-300"
                      : "bg-blue-500/20 border-blue-400 text-blue-300"
                  }`}
                >
                  ⏱️ {formatSeconds(remainingHoldSeconds)}
                </span>
              )}
              <button
                onClick={closeDrawer}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
                title="Close drawer"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 15-Minute Hold Countdown Banner */}
          {hasContent && remainingHoldSeconds > 0 && (
            <div
              className={`px-5 py-3 border-b flex items-center justify-between text-xs transition-colors ${
                isHoldExpired
                  ? "bg-red-50 border-red-200 text-red-800"
                  : isUrgent
                  ? "bg-red-500 text-white font-bold animate-pulse"
                  : isWarning
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-blue-50 border-blue-100 text-blue-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0" />
                <div>
                  {isHoldExpired ? (
                    <span className="font-bold">
                      Hold expired! Availability not guaranteed.
                    </span>
                  ) : (
                    <span>
                      Car reserved for you:{" "}
                      <strong className="font-mono text-sm tracking-wide">
                        {formatSeconds(remainingHoldSeconds)}
                      </strong>{" "}
                      remaining
                    </span>
                  )}
                </div>
              </div>

              {activeHoldBooking ? (
                <button
                  type="button"
                  onClick={handleReleaseHold}
                  disabled={releasing}
                  className="text-[11px] px-2.5 py-1 rounded-lg font-bold bg-white text-rose-700 hover:bg-rose-50 border border-rose-200 cursor-pointer transition-all shadow-2xs shrink-0"
                >
                  {releasing ? "Releasing…" : "Release"}
                </button>
              ) : (
                (isHoldExpired || isUrgent) && (
                  <button
                    onClick={resetHold}
                    className={`text-[11px] px-3 py-1 rounded-md font-bold cursor-pointer transition-all shadow-xs ${
                      isUrgent
                        ? "bg-white text-red-600 hover:bg-slate-100"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                    title="Extend 15-minute hold"
                  >
                    {isHoldExpired ? "Extend Hold" : "Extend (+15m)"}
                  </button>
                )
              )}
            </div>
          )}

          {/* Scrollable Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {!hasContent ? (
              <div className="text-center py-20 px-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 text-3xl flex items-center justify-center mx-auto mb-4">
                  🚘
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Your reservation basket is empty
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-6">
                  Select your vehicle and dates with an instant 15-minute hold to guarantee availability.
                </p>
                <button
                  onClick={closeDrawer}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  Explore Vehicles
                </button>
              </div>
            ) : activeHoldBooking ? (
              /* Active Backend Booking Hold Card */
              <div className="p-4 rounded-2xl border-2 border-blue-500/30 bg-blue-50/20 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs border-b border-blue-100 pb-2">
                  <span className="font-extrabold text-blue-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    <span>Active Checkout Hold</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                    15m Reservation
                  </span>
                </div>

                <div className="flex gap-3 items-center">
                  <div className="w-24 h-18 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 aspect-[16/10]">
                    <img
                      src={getCarPhotoUrl(
                        activeHoldBooking.car?.photos?.[0] || activeHoldBooking.car?.photo
                      )}
                      alt={activeHoldBooking.car?.modelName || "Car"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate">
                      {activeHoldBooking.car?.brand || activeHoldBooking.car?.make || ""}{" "}
                      {activeHoldBooking.car?.modelName || activeHoldBooking.car?.model || "Reserved Car"}
                    </h4>

                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>
                        {activeHoldBooking.car?.location?.city || "Phnom Penh, Cambodia"}
                      </span>
                    </p>

                    <div className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded-md shadow-2xs">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(activeHoldBooking.startDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        –{" "}
                        {new Date(activeHoldBooking.endDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        ({activeHoldBooking.totalDays || 1}{" "}
                        {activeHoldBooking.totalDays === 1 ? "day" : "days"})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-3 border border-blue-100 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Rental duration</span>
                    <span className="font-bold text-slate-900">
                      {activeHoldBooking.totalDays || 1} days
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Insurance protection</span>
                    <span className="font-bold text-emerald-600">Included</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold text-slate-900">
                    <span>Total price</span>
                    <span className="text-blue-700 font-extrabold text-sm">
                      ${Number(activeHoldBooking.totalPrice || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Local Basket Items */
              items.map((item, idx) => {
                const brand = item.car.brand || item.car.make || "Vehicle";
                const model = item.car.modelName || item.car.model || "Car";
                const city =
                  item.car.location?.city ||
                  item.car.location?.address ||
                  "Phnom Penh, Cambodia";
                const startStr = new Date(item.startDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                });
                const endStr = new Date(item.endDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                });
                const isEditing = editingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-all flex flex-col gap-3"
                  >
                    {/* Top Row: Thumbnail + Info */}
                    <div className="flex gap-3">
                      <div className="w-24 h-18 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 aspect-[16/10]">
                        <img
                          src={getCarPhotoUrl(item.car.photos?.[0], idx)}
                          alt={model}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-sm text-slate-900 truncate">
                            {brand} {model}
                          </h4>
                          <button
                            onClick={() => removeFromBasket(item.id)}
                            className="text-slate-400 hover:text-red-600 text-xs p-1 rounded-md cursor-pointer transition-colors"
                            title="Remove from basket"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                          📍 {city} · {item.car.category || "Sedan"}
                        </p>

                        <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          📅 {startStr} – {endStr} ({item.totalDays}{" "}
                          {item.totalDays === 1 ? "day" : "days"})
                        </div>
                      </div>
                    </div>

                    {/* Add-ons List */}
                    {item.addOns && item.addOns.length > 0 && !isEditing && (
                      <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] space-y-1 border border-slate-100">
                        <span className="font-bold text-slate-600 block text-[10px] uppercase tracking-wider">
                          Selected Add-ons &amp; Extras:
                        </span>
                        {item.addOns.map((addon) => (
                          <div
                            key={addon.id}
                            className="flex justify-between text-slate-700"
                          >
                            <span>
                              {addon.icon} {addon.name}
                            </span>
                            <span className="font-semibold">
                              ${addon.perDay ? addon.price * item.totalDays : addon.price}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Promo Code Input (For local items) */}
            {!activeHoldBooking && items.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <span className="font-bold">✓ Coupon &quot;{appliedPromo.code}&quot; applied</span>
                    </div>
                    <button
                      onClick={removePromoCode}
                      className="text-xs text-rose-600 hover:underline font-bold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo code (e.g. DRIVEKH10)"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-blue-600 uppercase font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Footer & Price Breakdown */}
          {hasContent && (
            <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Vehicles Subtotal</span>
                  <span className="font-semibold text-slate-800">
                    ${activeHoldBooking
                      ? Number(activeHoldBooking.totalPrice || 0).toFixed(2)
                      : subtotal.toFixed(2)}
                  </span>
                </div>
                {!activeHoldBooking && addOnsTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Add-ons &amp; Extras</span>
                    <span className="font-semibold text-slate-800">
                      ${addOnsTotal.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Insurance &amp; Protection</span>
                  <span className="font-semibold text-emerald-600">Included</span>
                </div>
                {!activeHoldBooking && discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Promo Discount</span>
                    <span>-${discountTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="h-px bg-slate-200 my-2" />
                <div className="flex justify-between text-base font-extrabold text-slate-900">
                  <span>Total Due</span>
                  <span className="text-lg text-blue-700 font-black">
                    ${activeHoldBooking
                      ? Number(activeHoldBooking.totalPrice || 0).toFixed(2)
                      : grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleProceedToCheckout}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <span>Continue to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {activeHoldBooking ? (
                  <button
                    onClick={handleReleaseHold}
                    disabled={releasing}
                    className="w-full py-2 text-center text-xs text-rose-600 hover:text-rose-800 font-bold hover:underline transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {releasing ? "Releasing hold…" : "Cancel reservation & release car"}
                  </button>
                ) : (
                  <button
                    onClick={closeDrawer}
                    className="w-full py-1.5 text-center text-[11px] text-slate-500 hover:text-slate-800 font-semibold transition-colors cursor-pointer"
                  >
                    Continue Browsing Cars
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

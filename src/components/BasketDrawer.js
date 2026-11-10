"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBasket } from "@/context/BasketContext";
import { getCarPhotoUrl } from "@/lib/api";
import {
  Clock,
  ArrowRight,
  X,
  Trash2,
  Calendar,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ShoppingBag,
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
    remainingHoldSeconds,
    isHoldExpired,
    resetHold,
    appliedPromo,
    applyPromoCode,
    removePromoCode,
    discountTotal,
    showToast,
  } = useBasket();

  const [inputCode, setInputCode] = useState("");
  const [releasing, setReleasing] = useState(false);

  const heldCarId =
    activeHoldBooking?.car?._id ||
    activeHoldBooking?.car?.id ||
    activeHoldBooking?.car;

  const displayItems = heldCarId
    ? items.filter((i) => (i.car?._id || i.car?.id) !== heldCarId)
    : items;

  if (!isDrawerOpen) return null;

  const isUrgent = remainingHoldSeconds > 0 && remainingHoldSeconds < 120;
  const isWarning = remainingHoldSeconds >= 120 && remainingHoldSeconds < 300;

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
        `/booking/checkout?bookingId=basket&carId=${first.car._id || first.car.id}&itemId=${first.id}`
      );
    }
  };

  const handleReleaseHold = async () => {
    setReleasing(true);
    try {
      const success = await releaseActiveHold();
      if (success && showToast) {
        showToast("Hold released", "info");
      }
    } finally {
      setReleasing(false);
    }
  };

  const hasContent = Boolean(activeHoldBooking) || items.length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={closeDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Basket {itemCount > 0 && <span className="text-slate-400 font-medium">({itemCount})</span>}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {remainingHoldSeconds > 0 && (
                <div
                  className={`font-mono text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                    isUrgent
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : isWarning
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{formatSeconds(remainingHoldSeconds)}</span>
                </div>
              )}
              <button
                type="button"
                onClick={closeDrawer}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Urgent Hold Strip */}
          {hasContent && remainingHoldSeconds > 0 && (isUrgent || isHoldExpired) && (
            <div
              className={`px-5 py-2.5 flex items-center justify-between text-xs font-semibold ${
                isHoldExpired ? "bg-rose-50 text-rose-800 border-b border-rose-200" : "bg-rose-600 text-white"
              }`}
            >
              <span>
                {isHoldExpired
                  ? "Hold expired"
                  : `Expires in ${formatSeconds(remainingHoldSeconds)}`}
              </span>
              {isHoldExpired && (
                <button
                  type="button"
                  onClick={resetHold}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Renew
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {!hasContent ? (
              <div className="text-center py-20 px-4">
                <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Your basket is empty
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mb-5">
                  Select a car and dates to reserve it.
                </p>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-5 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold rounded-full transition-colors cursor-pointer"
                >
                  Browse cars
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Hold Card */}
                {activeHoldBooking && (
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <div className="flex gap-3 items-start">
                      <div className="w-22 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={getCarPhotoUrl(
                            activeHoldBooking.car?.photos?.[0] || activeHoldBooking.car?.photo
                          )}
                          alt={activeHoldBooking.car?.modelName || "Car"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-slate-900 truncate">
                            {activeHoldBooking.car?.brand || activeHoldBooking.car?.make || ""}{" "}
                            {activeHoldBooking.car?.modelName || activeHoldBooking.car?.model || "Reserved Car"}
                          </h4>
                          <button
                            type="button"
                            onClick={handleReleaseHold}
                            disabled={releasing}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Release hold"
                          >
                            {releasing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <p className="text-xs text-slate-500 truncate">
                          {activeHoldBooking.car?.location?.city || "Phnom Penh"} · {activeHoldBooking.car?.category || "Sedan"}
                        </p>

                        <div className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(activeHoldBooking.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            {" – "}
                            {new Date(activeHoldBooking.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            {" "}({activeHoldBooking.totalDays || 1}d)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
                        <span className="text-base font-bold text-slate-900">
                          ${Number(activeHoldBooking.totalPrice || 0).toFixed(2)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleProceedToCheckout}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <span>Checkout</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Basket Items */}
                {displayItems.length > 0 && (
                  <div className="space-y-3">
                    {displayItems.map((item, idx) => {
                      const brand = item.car.brand || item.car.make || "Vehicle";
                      const model = item.car.modelName || item.car.model || "Car";
                      const city = item.car.location?.city || "Phnom Penh";
                      const startStr = new Date(item.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                      const endStr = new Date(item.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

                      return (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3"
                        >
                          <div className="flex gap-3 items-start">
                            <div className="w-22 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                              <img
                                src={getCarPhotoUrl(item.car.photos?.[0], idx)}
                                alt={model}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-sm text-slate-900 truncate">
                                  {brand} {model}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => removeFromBasket(item.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  title="Remove"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <p className="text-xs text-slate-500 truncate">
                                {city} · {item.car.category || "Sedan"}
                              </p>

                              <div className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                <Calendar className="w-3 h-3" />
                                <span>{startStr} – {endStr} ({item.totalDays}d)</span>
                              </div>
                            </div>
                          </div>

                          {item.addOns && item.addOns.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-2.5 text-xs space-y-1">
                              {item.addOns.map((addon) => (
                                <div key={addon.id} className="flex justify-between text-slate-700">
                                  <span>{addon.name}</span>
                                  <span className="font-semibold">
                                    ${addon.perDay ? addon.price * item.totalDays : addon.price}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Subtotal</span>
                              <span className="text-base font-bold text-slate-900">
                                ${item.itemTotal.toFixed(2)}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                closeDrawer();
                                router.push(
                                  `/booking/checkout?bookingId=basket&carId=${item.car._id || item.car.id}&itemId=${item.id}`
                                );
                              }}
                              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                            >
                              <span>Checkout</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Promo Code */}
                    {!activeHoldBooking && (
                      <div className="pt-1">
                        {appliedPromo ? (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>{appliedPromo.code} applied</span>
                            </div>
                            <button
                              type="button"
                              onClick={removePromoCode}
                              className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={handleApplyPromo} className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Promo code"
                              value={inputCode}
                              onChange={(e) => setInputCode(e.target.value)}
                              className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-600 uppercase font-mono"
                            />
                            <button
                              type="submit"
                              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                            >
                              Apply
                            </button>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Summary Footer */}
                    {!activeHoldBooking && items.length === 1 && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Rental ({items[0].totalDays}d)</span>
                          <span className="font-semibold text-slate-900">${items[0].carTotal.toFixed(2)}</span>
                        </div>
                        {items[0].addOnsTotal > 0 && (
                          <div className="flex justify-between text-slate-600">
                            <span>Extras</span>
                            <span className="font-semibold text-slate-900">${items[0].addOnsTotal.toFixed(2)}</span>
                          </div>
                        )}
                        {discountTotal > 0 && (
                          <div className="flex justify-between text-emerald-700 font-semibold">
                            <span>Discount</span>
                            <span>-${discountTotal.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="h-px bg-slate-200" />
                        <div className="flex justify-between text-sm font-bold text-slate-900">
                          <span>Total</span>
                          <span className="text-blue-600">
                            ${Math.max(0, items[0].itemTotal - discountTotal).toFixed(2)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleProceedToCheckout}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Continue to checkout</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

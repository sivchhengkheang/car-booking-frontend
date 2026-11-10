"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useBasket, AVAILABLE_ADDONS } from "@/context/BasketContext";
import { getCarPhotoUrl } from "@/lib/api";
import {
  Clock,
  ArrowRight,
  Calendar,
  ShoppingBag,
  Tag,
} from "lucide-react";

function formatSeconds(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function BasketPage() {
  const router = useRouter();
  const {
    items,
    activeHoldBooking,
    releaseActiveHold,
    removeFromBasket,
    saveForLater,
    updateItemAddOns,
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
  const [editingItemId, setEditingItemId] = useState(null);
  const [releasing, setReleasing] = useState(false);

  const heldCarId =
    activeHoldBooking?.car?._id ||
    activeHoldBooking?.car?.id ||
    activeHoldBooking?.car;

  const displayItems = heldCarId
    ? items.filter((i) => (i.car?._id || i.car?.id) !== heldCarId)
    : items;

  const isUrgent = remainingHoldSeconds > 0 && remainingHoldSeconds < 120;
  const isWarning = remainingHoldSeconds >= 120 && remainingHoldSeconds < 300;

  const handleApplyPromo = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    applyPromoCode(inputCode);
    setInputCode("");
  };

  const handleReleaseHold = async () => {
    setReleasing(true);
    try {
      await releaseActiveHold();
      if (showToast) showToast("Hold released", "info");
    } finally {
      setReleasing(false);
    }
  };

  const handleCheckout = () => {
    if (activeHoldBooking) {
      router.push(`/booking/checkout?bookingId=${activeHoldBooking._id}`);
      return;
    }
    if (items.length > 0) {
      const first = items[0];
      router.push(`/booking/checkout?bookingId=basket&carId=${first.car._id || first.car.id}`);
    }
  };

  const toggleItemAddon = (item, addon) => {
    const existing = item.addOns || [];
    const hasAddon = existing.some((a) => a.id === addon.id);
    const updated = hasAddon
      ? existing.filter((a) => a.id !== addon.id)
      : [...existing, addon];
    updateItemAddOns(item.id, updated);
  };

  return (
    <>
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Basket</h1>
            <p className="text-xs text-slate-500 mt-0.5">Saved vehicles and active holds</p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 no-underline shrink-0"
          >
            Browse cars
          </Link>
        </div>

        {/* Hold Banner */}
        {items.length > 0 && (
          <div
            className={`px-4 py-3 rounded-xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border ${
              isHoldExpired
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : isUrgent
                ? "bg-rose-600 border-rose-600 text-white"
                : isWarning
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-slate-100 border-slate-200 text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0" />
              {isHoldExpired ? (
                <span className="font-semibold">Hold expired</span>
              ) : (
                <span>
                  Held for <strong className="font-mono">{formatSeconds(remainingHoldSeconds)}</strong>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={resetHold}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs cursor-pointer ${
                isUrgent
                  ? "bg-white text-rose-600"
                  : isHoldExpired
                  ? "bg-rose-600 text-white"
                  : "bg-white text-slate-900 border border-slate-200"
              }`}
            >
              {isHoldExpired ? "Renew hold" : "+15m"}
            </button>
          </div>
        )}

        {items.length === 0 && !activeHoldBooking ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl max-w-md mx-auto my-10">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">Your basket is empty</h3>
            <p className="text-xs text-slate-500 mb-5">Select a vehicle and dates to begin.</p>
            <Link
              href="/"
              className="px-5 py-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold rounded-full no-underline inline-block"
            >
              Browse cars
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
            {/* Left List */}
            <div className="space-y-4">
              {activeHoldBooking && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                    <div className="flex gap-3.5">
                      <div className="w-24 h-18 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={getCarPhotoUrl(
                            activeHoldBooking.car?.photos?.[0] || activeHoldBooking.car?.photo
                          )}
                          alt={activeHoldBooking.car?.modelName || "Car"}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {activeHoldBooking.car?.brand || activeHoldBooking.car?.make || ""}{" "}
                          {activeHoldBooking.car?.modelName || activeHoldBooking.car?.model || "Reserved Car"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {activeHoldBooking.car?.location?.city || "Phnom Penh"} · {activeHoldBooking.car?.category || "SUV"}
                        </p>
                        <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {new Date(activeHoldBooking.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} –{" "}
                            {new Date(activeHoldBooking.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ({activeHoldBooking.totalDays || 1}d)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold text-slate-900">
                        ${Number(activeHoldBooking.totalPrice || 0).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        ${activeHoldBooking.car?.pricePerDay || 35}/d × {activeHoldBooking.totalDays || 1}d
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={handleReleaseHold}
                      disabled={releasing}
                      className="font-semibold text-rose-600 hover:underline cursor-pointer"
                    >
                      {releasing ? "Releasing…" : "Remove"}
                    </button>

                    <button
                      type="button"
                      onClick={handleCheckout}
                      className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Checkout (${Number(activeHoldBooking.totalPrice || 0).toFixed(2)})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {displayItems.length > 0 && (
                <div className="space-y-4">
                  {displayItems.map((item, idx) => {
                    const brand = item.car.brand || item.car.make || "Vehicle";
                    const model = item.car.modelName || item.car.model || "Car";
                    const city = item.car.location?.city || "Phnom Penh";
                    const startStr = new Date(item.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                    const endStr = new Date(item.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                    const isEditing = editingItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                          <div className="flex gap-3.5">
                            <div className="w-24 h-18 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                              <img
                                src={getCarPhotoUrl(item.car.photos?.[0], idx)}
                                alt={model}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div>
                              <h3 className="text-sm font-bold text-slate-900">
                                {brand} {model} <span className="text-xs text-slate-400 font-normal">{item.car.year || 2024}</span>
                              </h3>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {city} · {item.car.category || "Sedan"} · {item.car.transmission || "Automatic"}
                              </p>
                              <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                                <Calendar className="w-3 h-3" />
                                <span>{startStr} – {endStr} ({item.totalDays}d)</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-base font-bold text-slate-900">
                              ${item.itemTotal.toFixed(2)}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              ${item.pricePerDay}/d × {item.totalDays}d
                            </div>
                          </div>
                        </div>

                        {item.addOns && item.addOns.length > 0 && !isEditing && (
                          <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
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

                        {isEditing && (
                          <div className="bg-slate-50 rounded-xl p-3.5 text-xs space-y-2.5 border border-slate-200">
                            <div className="flex items-center justify-between font-semibold text-slate-900">
                              <span>Extras</span>
                              <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                className="text-blue-600 hover:underline text-xs cursor-pointer"
                              >
                                Done
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {AVAILABLE_ADDONS.map((addon) => {
                                const isChecked = (item.addOns || []).some((a) => a.id === addon.id);
                                return (
                                  <label
                                    key={addon.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 cursor-pointer text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleItemAddon(item, addon)}
                                        className="w-3.5 h-3.5 text-blue-600 rounded"
                                      />
                                      <span>{addon.name}</span>
                                    </div>
                                    <span className="font-semibold text-slate-700">
                                      +${addon.perDay ? addon.price * item.totalDays : addon.price}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setEditingItemId(isEditing ? null : item.id)}
                              className="font-semibold text-blue-600 hover:underline cursor-pointer"
                            >
                              {isEditing ? "Close" : "Extras"}
                            </button>
                            <span className="text-slate-300">·</span>
                            <button
                              type="button"
                              onClick={() => saveForLater(item.id)}
                              className="font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                              Save
                            </button>
                            <span className="text-slate-300">·</span>
                            <button
                              type="button"
                              onClick={() => removeFromBasket(item.id)}
                              className="font-medium text-rose-600 hover:underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/booking/checkout?bookingId=basket&carId=${item.car._id || item.car.id}&itemId=${item.id}`)
                            }
                            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Checkout (${item.itemTotal.toFixed(2)})</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Summary */}
            <div className="sticky top-24 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                Summary
              </h3>

              {/* Promo Code */}
              {appliedPromo ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Tag className="w-3.5 h-3.5" />
                    {appliedPromo.code}
                  </span>
                  <button
                    type="button"
                    onClick={removePromoCode}
                    className="text-emerald-700 hover:underline font-semibold cursor-pointer"
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

              {activeHoldBooking ? (
                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span>Active hold</span>
                    <span className="font-semibold text-slate-900">${Number(activeHoldBooking.totalPrice || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Insurance</span>
                    <span className="font-medium text-emerald-700">Included</span>
                  </div>
                  <div className="h-px bg-slate-200 my-2" />
                  <div className="flex justify-between text-sm font-bold text-slate-900">
                    <span>Total</span>
                    <span>${Number(activeHoldBooking.totalPrice || 0).toFixed(2)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Continue to checkout
                  </button>
                </div>
              ) : items.length === 1 ? (
                <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span>Rental ({items[0].totalDays}d)</span>
                    <span className="font-semibold text-slate-900">${items[0].carTotal.toFixed(2)}</span>
                  </div>
                  {items[0].addOnsTotal > 0 && (
                    <div className="flex justify-between">
                      <span>Extras</span>
                      <span className="font-semibold text-slate-900">${items[0].addOnsTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Insurance</span>
                    <span className="font-medium text-emerald-700">Included</span>
                  </div>
                  {discountTotal > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Discount</span>
                      <span>-${discountTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="h-px bg-slate-200 my-2" />
                  <div className="flex justify-between text-sm font-bold text-slate-900">
                    <span>Total</span>
                    <span>${Math.max(0, items[0].itemTotal - discountTotal).toFixed(2)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Continue to checkout
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <p className="text-slate-500">
                    Select &ldquo;Checkout&rdquo; on any vehicle to begin a 15-minute hold.
                  </p>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Checkout {items[0]?.car?.brand || ""} {items[0]?.car?.modelName || ""} (${items[0]?.itemTotal?.toFixed(2)})
                  </button>
                </div>
              )}

              <p className="text-[11px] text-slate-400 text-center">
                15-minute hold · KHQR &amp; card payment
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

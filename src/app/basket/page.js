"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useBasket, AVAILABLE_ADDONS } from "@/context/BasketContext";
import { getCarPhotoUrl } from "@/lib/api";

function formatSeconds(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function BasketPage() {
  const router = useRouter();
  const {
    items,
    itemCount,
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
    subtotal,
    addOnsTotal,
    serviceFee,
    discountTotal,
    grandTotal,
    showToast,
  } = useBasket();

  const [inputCode, setInputCode] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);

  const isUrgent = remainingHoldSeconds > 0 && remainingHoldSeconds < 120;
  const isWarning = remainingHoldSeconds >= 120 && remainingHoldSeconds < 300;

  const handleApplyPromo = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    applyPromoCode(inputCode);
    setInputCode("");
  };

  const [releasing, setReleasing] = useState(false);

  const handleReleaseHold = async () => {
    setReleasing(true);
    try {
      await releaseActiveHold();
      if (showToast) showToast("Reservation hold released. Car is now available.", "info");
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
    let updated;
    if (hasAddon) {
      updated = existing.filter((a) => a.id !== addon.id);
    } else {
      updated = [...existing, addon];
    }
    updateItemAddOns(item.id, updated);
  };

  return (
    <>
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Your Rental Basket
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Multi-vehicle reservation with active 15-minute hold protection
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all no-underline shrink-0"
          >
            ← Add Another Vehicle
          </Link>
        </div>

        {/* 15-Minute Hold Countdown Banner */}
        {items.length > 0 && (
          <div
            className={`p-4 rounded-2xl mb-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border shadow-xs transition-colors ${
              isHoldExpired
                ? "bg-red-50 border-red-200 text-red-800"
                : isUrgent
                ? "bg-red-500 text-white font-bold animate-pulse"
                : isWarning
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-blue-50 border-blue-200 text-blue-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">⏱️</span>
              <div>
                {isHoldExpired ? (
                  <span className="font-bold text-sm">
                    Hold expired! Vehicle availability is not guaranteed.
                  </span>
                ) : (
                  <span>
                    Your cars are held for{" "}
                    <strong className="font-mono text-base tracking-wide">
                      {formatSeconds(remainingHoldSeconds)}
                    </strong>
                  </span>
                )}
                <div className="text-[11px] opacity-80 mt-0.5">
                  Vehicles remain locked in your session until the timer expires.
                </div>
              </div>
            </div>

            <button
              onClick={resetHold}
              className={`px-4 py-2 rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-all ${
                isUrgent
                  ? "bg-white text-red-600 hover:bg-slate-100"
                  : isHoldExpired
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-white text-slate-900 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              {isHoldExpired ? "Extend / Re-check availability" : "Extend Hold (+15m)"}
            </button>
          </div>
        )}

        {items.length === 0 && !activeHoldBooking ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl shadow-xs max-w-lg mx-auto my-12">
            <div className="text-5xl mb-4">🛒</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Your basket is empty</h3>
            <p className="text-xs text-slate-500 mb-6">
              You haven&apos;t reserved any vehicles yet. Explore our fleet across Cambodia and add cars for
              you or your family and friends.
            </p>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full shadow-md transition-all no-underline inline-block"
            >
              Explore Vehicles
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
            {/* Left: Items List or Active Hold */}
            <div className="space-y-4">
              {activeHoldBooking ? (
                <div className="bg-white border-2 border-blue-500/30 rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                      <span className="font-extrabold text-sm text-blue-900">
                        Active Reservation Hold
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
                      15m Hold Active
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="w-32 h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 aspect-[16/10]">
                      <img
                        src={getCarPhotoUrl(
                          activeHoldBooking.car?.photos?.[0] || activeHoldBooking.car?.photo
                        )}
                        alt={activeHoldBooking.car?.modelName || "Car"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-base text-slate-900">
                        {activeHoldBooking.car?.brand || activeHoldBooking.car?.make || ""}{" "}
                        {activeHoldBooking.car?.modelName || activeHoldBooking.car?.model || "Reserved Car"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        📍 {activeHoldBooking.car?.location?.city || "Phnom Penh, Cambodia"}
                      </p>
                      <div className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl">
                        📅 {new Date(activeHoldBooking.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {new Date(activeHoldBooking.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ({activeHoldBooking.totalDays || 1} days)
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleReleaseHold}
                      disabled={releasing}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer disabled:opacity-50"
                    >
                      {releasing ? "Releasing hold…" : "Release / Cancel Hold"}
                    </button>
                    <span className="text-sm font-bold text-slate-700">
                      Total: <span className="text-blue-700 font-black text-base">${Number(activeHoldBooking.totalPrice || 0).toFixed(2)}</span>
                    </span>
                  </div>
                </div>
              ) : null}

              {items.map((item, idx) => {
                const brand = item.car.brand || item.car.make || "Vehicle";
                const model = item.car.modelName || item.car.model || "Car";
                const city = item.car.location?.city || item.car.location?.address || "Phnom Penh, Cambodia";
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
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-slate-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
                      <div className="flex gap-4">
                        <div className="w-28 h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          <img
                            src={getCarPhotoUrl(item.car.photos?.[0], idx)}
                            alt={model}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            {brand} {model} <span className="text-xs text-slate-400 font-normal">({item.car.year || 2024})</span>
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            📍 {city} · {item.car.category || "Sedan"} · {item.car.transmission || "Automatic"}
                          </p>
                          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">
                            📅 {startStr} → {endStr} ({item.totalDays} {item.totalDays === 1 ? "day" : "days"})
                          </div>
                        </div>
                      </div>

                      <div className="text-right sm:self-start">
                        <div className="text-lg font-black text-slate-900">
                          ${item.itemTotal.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-400">
                          ${item.pricePerDay}/day × {item.totalDays}d
                          {item.addOnsTotal > 0 ? " + extras" : ""}
                        </div>
                      </div>
                    </div>

                    {/* Add-ons List */}
                    {item.addOns && item.addOns.length > 0 && !isEditing && (
                      <div className="bg-slate-50 rounded-2xl p-3 text-xs space-y-1.5 border border-slate-100">
                        <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                          Selected Add-ons &amp; Extras:
                        </span>
                        {item.addOns.map((addon) => (
                          <div key={addon.id} className="flex justify-between text-slate-700">
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

                    {/* Inline Edit Add-ons */}
                    {isEditing && (
                      <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-3 border border-blue-200 animate-fade-in">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>Customize Vehicle Add-ons:</span>
                          <button
                            onClick={() => setEditingItemId(null)}
                            className="text-blue-600 hover:underline text-xs cursor-pointer"
                          >
                            Save &amp; Close
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {AVAILABLE_ADDONS.map((addon) => {
                            const isChecked = (item.addOns || []).some((a) => a.id === addon.id);
                            return (
                              <label
                                key={addon.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 hover:border-blue-400 cursor-pointer select-none text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleItemAddon(item, addon)}
                                    className="w-4 h-4 text-blue-600 rounded"
                                  />
                                  <span>
                                    {addon.icon} {addon.name}
                                  </span>
                                </div>
                                <span className="font-bold text-slate-700">
                                  +${addon.perDay ? addon.price * item.totalDays : addon.price}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Actions: Edit, Save for later, Remove */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditingItemId(isEditing ? null : item.id)}
                          className="font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          {isEditing ? "Close extras" : "Edit add-ons"}
                        </button>
                        <span>·</span>
                        <button
                          onClick={() => saveForLater(item.id)}
                          className="font-semibold text-slate-600 hover:text-amber-700 cursor-pointer"
                        >
                          Save for later
                        </button>
                        <span>·</span>
                        <button
                          onClick={() => removeFromBasket(item.id)}
                          className="font-semibold text-red-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>

                      <span className="text-slate-400 text-[11px]">
                        Held in reservation session
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Sticky Order Summary */}
            <div className="sticky top-28 bg-white border border-slate-200 rounded-3xl p-6 shadow-xl space-y-5">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Order Summary
              </h3>

              {/* Promo code field */}
              <div>
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span>🏷️</span>
                      <span>
                        Promo <strong>{appliedPromo.code}</strong> applied
                      </span>
                    </div>
                    <button
                      onClick={removePromoCode}
                      className="text-emerald-700 hover:text-emerald-900 font-bold text-xs underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo code (DRIVEKH10)"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden uppercase font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Apply
                    </button>
                  </form>
                )}
              </div>

              {/* Breakdown */}
              <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Vehicles Subtotal</span>
                  <span className="font-semibold text-slate-900">
                    ${activeHoldBooking ? Number(activeHoldBooking.totalPrice || 0).toFixed(2) : subtotal.toFixed(2)}
                  </span>
                </div>
                {!activeHoldBooking && addOnsTotal > 0 && (
                  <div className="flex justify-between">
                    <span>Add-ons &amp; Protection</span>
                    <span className="font-semibold text-slate-900">${addOnsTotal.toFixed(2)}</span>
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
                  <span className="text-xl text-blue-700 font-black">
                    ${activeHoldBooking ? Number(activeHoldBooking.totalPrice || 0).toFixed(2) : grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer"
              >
                Proceed to Checkout ({itemCount} {itemCount === 1 ? "car" : "cars"}) →
              </button>

              <p className="text-[11px] text-slate-400 text-center">
                🔒 Guaranteed 15-minute hold · KHQR Baray payments
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

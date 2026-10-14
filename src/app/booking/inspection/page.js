"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { getMyBookings, getCarPhotoUrl } from "@/lib/api";
import { useBasket } from "@/context/BasketContext";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("kid_access_token");
}

function InspectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const initialMode = searchParams.get("mode") || "pickup"; // 'pickup' or 'return'

  const { showToast } = useBasket();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(initialMode); // 'pickup' or 'return'

  // Pick-up Inspection State
  const [pickupOdometer, setPickupOdometer] = useState("48,250");
  const [pickupFuel, setPickupFuel] = useState("100%"); // 100%, 75%, 50%, 25%
  const [photosCaptured, setPhotosCaptured] = useState({
    front: true,
    rear: false,
    driverSide: false,
    passengerSide: false,
    dashboard: false,
  });
  const [scratchNotes, setScratchNotes] = useState(
    "Minor 2cm surface stone chip on lower front bumper. No dent."
  );
  const [handoverConfirmed, setHandoverConfirmed] = useState(false);

  // Return Inspection State
  const [returnOdometer, setReturnOdometer] = useState("48,580");
  const [returnFuel, setReturnFuel] = useState("100%");
  const [returnPhotosCaptured, setReturnPhotosCaptured] = useState({
    front: false,
    rear: false,
    dashboard: false,
  });
  const [returnConfirmed, setReturnConfirmed] = useState(false);
  const [depositRefunded, setDepositRefunded] = useState(false);

  const displayRef = (bookingId || "DKH-849204").replace(/^DKH-/, "").toUpperCase().slice(-8);

  useEffect(() => {
    const token = getToken();
    if (!token || !bookingId || bookingId.startsWith("DKH-")) {
      setLoading(false);
      return;
    }

    getMyBookings(token)
      .then((data) => {
        if (data.success) {
          const found = (data.bookings || []).find((b) => b._id === bookingId);
          if (found) setBooking(found);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookingId]);

  const togglePhoto = (key) => {
    if (mode === "pickup") {
      setPhotosCaptured((prev) => ({ ...prev, [key]: !prev[key] }));
      showToast(`Walkaround photo for ${key} recorded!`);
    } else {
      setReturnPhotosCaptured((prev) => ({ ...prev, [key]: !prev[key] }));
      showToast(`Return inspection photo for ${key} recorded!`);
    }
  };

  const handleConfirmPickupHandover = () => {
    setHandoverConfirmed(true);
    showToast("Vehicle Handover Confirmed! Keys unlocked.");
  };

  const handleConfirmReturn = () => {
    setReturnConfirmed(true);
    setDepositRefunded(true);
    showToast("Return inspection verified! $100.00 deposit released.");
  };

  const car = booking?.car;
  const brand = car?.brand || "Toyota";
  const model = car?.modelName || "Camry 2024";
  const plate = car?.licensePlate || "2BT-8942 PP";

  return (
    <>
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Inspection Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                Trip Inspection &amp; Handover
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">#{displayRef}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Vehicle Condition &amp; Handover Log
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Joint in-app inspection between Renter and Host to record mileage, fuel, and condition
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-white border border-slate-300 rounded-full p-1 shadow-xs shrink-0">
            <button
              onClick={() => setMode("pickup")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                mode === "pickup"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              1. Pick-up Handover
            </button>
            <button
              onClick={() => setMode("return")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                mode === "return"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              2. Return &amp; Deposit
            </button>
          </div>
        </div>

        {/* Vehicle Identity Header Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
              <img
                src={getCarPhotoUrl(car?.photos?.[0])}
                alt={model}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {brand} {model}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-800">
                  Plate: {plate}
                </span>
                <span>·</span>
                <span>Phnom Penh Fleet Depot</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/booking/success?bookingId=${bookingId || displayRef}`}
              className="text-xs font-bold text-blue-600 hover:underline px-3 py-1.5"
            >
              View Digital Voucher
            </Link>
          </div>
        </div>

        {/* Mode A: Pick-up Handover Inspection */}
        {mode === "pickup" && (
          <div className="space-y-6">
            {handoverConfirmed ? (
              <div className="bg-white border border-emerald-200 rounded-3xl p-8 text-center shadow-lg space-y-4 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl flex items-center justify-center mx-auto">
                  ✓
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Pick-up Handover Confirmed &amp; Signed
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Both host and renter have verified odometer (<strong>{pickupOdometer} km</strong>), fuel level (<strong>{pickupFuel}</strong>), and walkaround photos. The keys are officially handed over!
                </p>

                <div className="p-4 bg-slate-50 rounded-2xl max-w-sm mx-auto text-xs text-left space-y-1.5 border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Handover Time:</span>
                    <span className="font-semibold">{new Date().toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Inspection Pass:</span>
                    <span className="font-mono font-bold text-emerald-700">PASS-VERIFIED</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recorded Scratches:</span>
                    <span className="font-semibold text-slate-800">1 Logged</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => setMode("return")}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Proceed to Return Flow when trip ends →
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Step 1: Record Mileage &amp; Fuel Level
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verify the physical dashboard before taking off
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Initial Odometer (km reading) *
                    </label>
                    <input
                      type="text"
                      value={pickupOdometer}
                      onChange={(e) => setPickupOdometer(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fuel Gauge Level *
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {["100%", "75%", "50%", "25%"].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setPickupFuel(f)}
                          className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            pickupFuel === f
                              ? "border-blue-600 bg-blue-50 text-blue-800 shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4-Side Walkaround Photos */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Step 2: Vehicle Walkaround Photos (4 Angles)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tap each angle to snap and register photo in the handover vault
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { id: "front", label: "Front Angle", icon: "🚘" },
                      { id: "rear", label: "Rear Angle", icon: "🚗" },
                      { id: "driverSide", label: "Driver Side", icon: "🚙" },
                      { id: "passengerSide", label: "Passenger Side", icon: "🚐" },
                      { id: "dashboard", label: "Odometer Dash", icon: "📟" },
                    ].map((slot) => {
                      const isTaken = photosCaptured[slot.id];
                      return (
                        <div
                          key={slot.id}
                          onClick={() => togglePhoto(slot.id)}
                          className={`p-3 rounded-2xl border text-center cursor-pointer transition-all ${
                            isTaken
                              ? "border-emerald-500 bg-emerald-50/60 shadow-xs"
                              : "border-dashed border-slate-300 hover:border-blue-400 bg-slate-50"
                          }`}
                        >
                          <div className="text-xl mb-1">{isTaken ? "✅" : slot.icon}</div>
                          <div className="text-[11px] font-bold text-slate-800">{slot.label}</div>
                          <div className="text-[10px] text-slate-400">
                            {isTaken ? "Uploaded" : "Tap to Snap"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pre-existing Scratches / Notes */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Step 3: Pre-existing Scratches or Wear Notes
                  </label>
                  <textarea
                    rows={3}
                    value={scratchNotes}
                    onChange={(e) => setScratchNotes(e.target.value)}
                    placeholder="Log any noticeable scratches, windshield chips, or rim scuffs here..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-hidden"
                  />
                  <p className="text-[11px] text-slate-400">
                    Both parties are protected: renter will not be held accountable for logged damages.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">
                    Inspection verified by Host &amp; Renter
                  </span>

                  <button
                    onClick={handleConfirmPickupHandover}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Confirm Handover &amp; Unlock Keys →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode B: Return & Deposit Refund */}
        {mode === "return" && (
          <div className="space-y-6">
            {depositRefunded ? (
              <div className="bg-white border border-emerald-200 rounded-3xl p-8 text-center shadow-lg space-y-4 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 text-3xl flex items-center justify-center mx-auto">
                  💰
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Return Verified &amp; $100.00 Deposit Released!
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Vehicle returned in pristine condition. Final odometer reading confirmed at{" "}
                  <strong>{returnOdometer} km</strong>. Full tank confirmed.
                </p>

                <div className="p-4 bg-emerald-50 rounded-2xl max-w-sm mx-auto text-xs text-left space-y-2 border border-emerald-200">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Refund Status:</span>
                    <span className="font-bold text-emerald-800">REFUND PROCESSED</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Deposit Amount:</span>
                    <span className="font-bold text-emerald-800">$100.00 USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Refund Method:</span>
                    <span className="font-semibold text-slate-800">Original Baray Account (ABA)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Refund Transaction:</span>
                    <span className="font-mono text-slate-800">#RFND-94821</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <Link
                    href="/booking/my"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all no-underline inline-block"
                  >
                    View in My Trips &amp; Leave Review →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Step 1: Check-in Return Odometer &amp; Fuel
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Compare end readings against the pick-up handover log
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Return Odometer (km reading) *
                    </label>
                    <input
                      type="text"
                      value={returnOdometer}
                      onChange={(e) => setReturnOdometer(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold"
                    />
                    <div className="text-[10px] text-slate-400 mt-1">
                      Initial was: 48,250 km (330 km driven - within allowance)
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Return Fuel Gauge *
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {["100%", "75%", "50%", "25%"].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setReturnFuel(f)}
                          className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            returnFuel === f
                              ? "border-blue-600 bg-blue-50 text-blue-800 shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Return Photos Check */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Step 2: Return Verification Photos
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Confirm no new dents or scratches occurred during the rental period
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "front", label: "Return Front" },
                      { id: "rear", label: "Return Rear" },
                      { id: "dashboard", label: "Final Dash & Fuel" },
                    ].map((slot) => {
                      const isTaken = returnPhotosCaptured[slot.id];
                      return (
                        <div
                          key={slot.id}
                          onClick={() => togglePhoto(slot.id)}
                          className={`p-4 rounded-2xl border text-center cursor-pointer transition-all ${
                            isTaken
                              ? "border-emerald-500 bg-emerald-50/60 shadow-xs"
                              : "border-dashed border-slate-300 hover:border-blue-400 bg-slate-50"
                          }`}
                        >
                          <div className="text-xl mb-1">{isTaken ? "✅" : "📸"}</div>
                          <div className="text-xs font-bold text-slate-800">{slot.label}</div>
                          <div className="text-[10px] text-slate-400">
                            {isTaken ? "Verified" : "Tap to verify"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Deposit Refund Calculation Banner */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-emerald-900">
                      Eligible for 100% Deposit Release
                    </div>
                    <div className="text-emerald-700 text-[11px] mt-0.5">
                      No damages reported · Full fuel level matched
                    </div>
                  </div>
                  <div className="text-base font-black text-emerald-800">$100.00 USD</div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">
                    Host &amp; Renter Signoff
                  </span>

                  <button
                    onClick={handleConfirmReturn}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Confirm Return &amp; Release $100 Deposit →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

export default function InspectionPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full p-24 text-center text-sm font-semibold text-slate-500">
          Loading inspection log…
        </div>
      }
    >
      <InspectionContent />
    </Suspense>
  );
}

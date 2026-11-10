"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Camera, CheckCircle2, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getMyBookings, getCarPhotoUrl } from "@/lib/api";
import { useBasket } from "@/context/BasketContext";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("kid_access_token");
}

function InspectionContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const initialMode = searchParams.get("mode") || "pickup";

  const { showToast } = useBasket();

  const [booking, setBooking] = useState(null);
  const [mode, setMode] = useState(initialMode);

  const [pickupOdometer, setPickupOdometer] = useState("48,250");
  const [pickupFuel, setPickupFuel] = useState("100%");
  const [photosCaptured, setPhotosCaptured] = useState({
    front: true,
    rear: false,
    driverSide: false,
    passengerSide: false,
    dashboard: false,
  });
  const [scratchNotes, setScratchNotes] = useState("");
  const [handoverConfirmed, setHandoverConfirmed] = useState(false);

  const [returnOdometer, setReturnOdometer] = useState("48,580");
  const [returnFuel, setReturnFuel] = useState("100%");
  const [returnPhotosCaptured, setReturnPhotosCaptured] = useState({
    front: false,
    rear: false,
    dashboard: false,
  });
  const [depositRefunded, setDepositRefunded] = useState(false);

  const displayRef = (bookingId || "DKH-849204").replace(/^DKH-/, "").toUpperCase().slice(-8);

  useEffect(() => {
    const token = getToken();
    if (!token || !bookingId || bookingId.startsWith("DKH-")) return;

    getMyBookings(token)
      .then((data) => {
        if (data.success) {
          const found = (data.bookings || []).find((b) => b._id === bookingId);
          if (found) setBooking(found);
        }
      })
      .catch(() => {});
  }, [bookingId]);

  const togglePhoto = (key) => {
    if (mode === "pickup") {
      setPhotosCaptured((prev) => ({ ...prev, [key]: !prev[key] }));
      showToast(`Photo recorded (${key})`);
    } else {
      setReturnPhotosCaptured((prev) => ({ ...prev, [key]: !prev[key] }));
      showToast(`Return photo recorded (${key})`);
    }
  };

  const handleConfirmPickupHandover = () => {
    setHandoverConfirmed(true);
    showToast("Pick-up handover confirmed");
  };

  const handleConfirmReturn = () => {
    setDepositRefunded(true);
    showToast("Return verified · $100 deposit released");
  };

  const car = booking?.car;
  const brand = car?.brand || "Toyota";
  const model = car?.modelName || "Camry 2024";
  const plate = car?.licensePlate || "2BT-8942 PP";

  return (
    <>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Inspection</span>
              <span>·</span>
              <span className="font-mono font-semibold text-slate-700">#{displayRef}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Vehicle Inspection
            </h1>
          </div>

          <div className="flex items-center bg-white border border-slate-200 rounded-full p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setMode("pickup")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                mode === "pickup" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pick-up
            </button>
            <button
              type="button"
              onClick={() => setMode("return")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                mode === "return" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Return
            </button>
          </div>
        </div>

        {/* Vehicle Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
              <img src={getCarPhotoUrl(car?.photos?.[0])} alt={model} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{brand} {model}</h2>
              <p className="text-xs text-slate-500 font-mono">{plate}</p>
            </div>
          </div>

          <Link
            href={`/booking/success?bookingId=${bookingId || displayRef}`}
            className="text-xs font-semibold text-blue-600 hover:underline no-underline"
          >
            View pass
          </Link>
        </div>

        {/* Pick-up Flow */}
        {mode === "pickup" && (
          <div>
            {handoverConfirmed ? (
              <div className="bg-white border border-emerald-200 rounded-2xl p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Pick-up confirmed</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Odometer <strong className="text-slate-900">{pickupOdometer} km</strong> · Fuel <strong className="text-slate-900">{pickupFuel}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => setMode("return")}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Switch to return inspection
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Odometer (km)
                    </label>
                    <input
                      type="text"
                      value={pickupOdometer}
                      onChange={(e) => setPickupOdometer(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Fuel level
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {["100%", "75%", "50%", "25%"].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setPickupFuel(f)}
                          className={`py-2 text-xs font-semibold rounded-xl border cursor-pointer ${
                            pickupFuel === f
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Condition Photos */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Walkaround photos
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { id: "front", label: "Front" },
                      { id: "rear", label: "Rear" },
                      { id: "driverSide", label: "Left side" },
                      { id: "passengerSide", label: "Right side" },
                      { id: "dashboard", label: "Dashboard" },
                    ].map((slot) => {
                      const isTaken = photosCaptured[slot.id];
                      return (
                        <button
                          type="button"
                          key={slot.id}
                          onClick={() => togglePhoto(slot.id)}
                          className={`p-3 rounded-xl border text-center cursor-pointer transition-colors ${
                            isTaken
                              ? "border-emerald-300 bg-emerald-50/60"
                              : "border-dashed border-slate-300 hover:border-blue-400 bg-slate-50"
                          }`}
                        >
                          {isTaken ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                          ) : (
                            <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                          )}
                          <div className="text-xs font-semibold text-slate-800">{slot.label}</div>
                          <div className="text-[10px] text-slate-400">
                            {isTaken ? "Recorded" : "Capture"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Existing marks or notes
                  </label>
                  <textarea
                    rows={2}
                    value={scratchNotes}
                    onChange={(e) => setScratchNotes(e.target.value)}
                    placeholder="Optional notes on pre-existing scratches…"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-600"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleConfirmPickupHandover}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Confirm handover
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Return Flow */}
        {mode === "return" && (
          <div>
            {depositRefunded ? (
              <div className="bg-white border border-emerald-200 rounded-2xl p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Return verified</h3>
                <p className="text-xs text-slate-600">
                  Odometer <strong className="text-slate-900">{returnOdometer} km</strong> · $100.00 deposit refunded
                </p>
                <Link
                  href="/booking/my"
                  className="inline-block px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white font-semibold text-xs rounded-xl no-underline"
                >
                  Back to My Trips
                </Link>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Return odometer (km)
                    </label>
                    <input
                      type="text"
                      value={returnOdometer}
                      onChange={(e) => setReturnOdometer(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Return fuel level
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {["100%", "75%", "50%", "25%"].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setReturnFuel(f)}
                          className={`py-2 text-xs font-semibold rounded-xl border cursor-pointer ${
                            returnFuel === f
                              ? "border-blue-600 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Return photos
                  </h3>

                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: "front", label: "Front" },
                      { id: "rear", label: "Rear" },
                      { id: "dashboard", label: "Dashboard" },
                    ].map((slot) => {
                      const isTaken = returnPhotosCaptured[slot.id];
                      return (
                        <button
                          type="button"
                          key={slot.id}
                          onClick={() => togglePhoto(slot.id)}
                          className={`p-3 rounded-xl border text-center cursor-pointer transition-colors ${
                            isTaken
                              ? "border-emerald-300 bg-emerald-50/60"
                              : "border-dashed border-slate-300 hover:border-blue-400 bg-slate-50"
                          }`}
                        >
                          {isTaken ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                          ) : (
                            <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                          )}
                          <div className="text-xs font-semibold text-slate-800">{slot.label}</div>
                          <div className="text-[10px] text-slate-400">
                            {isTaken ? "Verified" : "Capture"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-900">Deposit refund</span>
                  <span className="font-bold text-emerald-800">$100.00</span>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleConfirmReturn}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Confirm return &amp; refund
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

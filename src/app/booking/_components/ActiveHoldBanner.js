"use client";
import { ArrowRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

function formatDateDisplay(date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export default function ActiveHoldBanner({
  activeUserHold,
  holdSecondsRemaining,
  cancellingHold,
  onCancelHold,
}) {
  const router = useRouter();
  if (!activeUserHold || holdSecondsRemaining <= 0) return null;

  const minutes = Math.floor(holdSecondsRemaining / 60);
  const seconds = String(holdSecondsRemaining % 60).padStart(2, "0");
  const isUrgent = holdSecondsRemaining <= 120;

  return (
    <div
      className={`mb-5 p-3.5 rounded-xl border ${
        isUrgent ? "bg-rose-50 border-rose-200" : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`text-xs font-bold ${isUrgent ? "text-rose-900" : "text-amber-900"}`}>
          {isUrgent ? "Hold expiring soon" : "Active hold"}
        </span>
        <span
          className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border ${
            isUrgent ? "text-rose-700 border-rose-200" : "text-amber-800 border-amber-200"
          }`}
        >
          <Clock className="w-3 h-3" />
          {minutes}:{seconds}
        </span>
      </div>

      <p className="text-xs text-slate-600 mb-3">
        {formatDateDisplay(activeUserHold.startDate)} – {formatDateDisplay(activeUserHold.endDate)}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push(`/booking/checkout?bookingId=${activeUserHold._id}`)}
          className="flex-1 py-2 px-3 rounded-lg bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Checkout</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onCancelHold}
          disabled={cancellingHold}
          className="py-2 px-3 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
        >
          {cancellingHold ? "Releasing…" : "Release"}
        </button>
      </div>
    </div>
  );
}

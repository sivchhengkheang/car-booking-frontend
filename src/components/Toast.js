"use client";
import { useBasket } from "@/context/BasketContext";

export default function Toast() {
  const { toast } = useBasket();

  if (!toast) return null;

  const bgColors = {
    success: "bg-slate-900 border-blue-500/50 text-white",
    info: "bg-slate-900 border-slate-700 text-white",
    error: "bg-red-950 border-red-500 text-white",
  };

  const icons = {
    success: "✅",
    info: "ℹ️",
    error: "⚠️",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in pointer-events-none">
      <div
        className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-semibold ${
          bgColors[toast.type] || bgColors.info
        }`}
      >
        <span>{icons[toast.type] || "✨"}</span>
        <span>{toast.msg}</span>
      </div>
    </div>
  );
}

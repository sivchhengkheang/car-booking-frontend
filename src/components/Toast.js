"use client";
import { CheckCircle2, Info, AlertCircle } from "lucide-react";
import { useBasket } from "@/context/BasketContext";

export default function Toast() {
  const { toast } = useBasket();

  if (!toast) return null;

  const styles = {
    success: "bg-slate-900 border-slate-800 text-white",
    info: "bg-slate-900 border-slate-800 text-white",
    error: "bg-rose-600 border-rose-500 text-white",
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-white shrink-0" />,
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-fade-in pointer-events-none">
      <div
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border shadow-lg text-xs font-medium ${
          styles[toast.type] || styles.info
        }`}
      >
        {icons[toast.type] || icons.info}
        <span>{toast.msg}</span>
      </div>
    </div>
  );
}

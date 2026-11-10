"use client";

const STATUS_STYLES = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  CONFIRMED: "bg-sky-50 text-sky-700 border-sky-200/70",
  COMPLETED: "bg-slate-100 text-slate-700 border-slate-200/80",
  SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
  PENDING_PAYMENT: "bg-amber-50 text-amber-700 border-amber-200/70",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200/70",
  PROVISIONAL: "bg-amber-50 text-amber-700 border-amber-200/70",
  MAINTENANCE: "bg-amber-50 text-amber-700 border-amber-200/70",
  UNAVAILABLE: "bg-slate-100 text-slate-600 border-slate-200/80",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200/70",
  SUSPENDED: "bg-rose-50 text-rose-700 border-rose-200/70",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200/70",
  REFUNDED: "bg-violet-50 text-violet-700 border-violet-200/70",
  ADMIN: "bg-slate-900 text-white border-slate-900",
  HOST: "bg-sky-50 text-sky-700 border-sky-200/70",
  CUSTOMER: "bg-slate-100 text-slate-700 border-slate-200/80",
};

const LABELS = {
  PENDING_PAYMENT: "Pending",
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  MAINTENANCE: "Maintenance",
};

export default function StatusBadge({ status }) {
  const key = String(status || "UNKNOWN").toUpperCase();
  const cls = STATUS_STYLES[key] || "bg-slate-100 text-slate-600 border-slate-200/80";
  const label = LABELS[key] || key.charAt(0) + key.slice(1).toLowerCase().replaceAll("_", " ");

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatShortDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function getDashboardToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("kid_access_token");
}

export function downloadCsv(filename, headers, rows) {
  if (typeof window === "undefined") return;
  const escape = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

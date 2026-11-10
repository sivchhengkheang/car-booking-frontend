"use client";

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  sparkData = null,
  sparkColor = "#2563eb",
}) {
  const hasSpark = Array.isArray(sparkData) && sparkData.length >= 2;
  let sparkPath = "";
  if (hasSpark) {
    const min = Math.min(...sparkData);
    const max = Math.max(...sparkData);
    const range = max - min || 1;
    const w = 64;
    const h = 24;
    sparkPath = sparkData
      .map((val, idx) => {
        const x = (idx / (sparkData.length - 1)) * w;
        const y = h - 3 - ((val - min) / range) * (h - 6);
        return `${idx === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-2">
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5 truncate">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          <span className="truncate">{title}</span>
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums leading-none">
          {value}
        </div>
        {hasSpark && (
          <svg
            viewBox="0 0 64 24"
            className="w-16 h-6 shrink-0 overflow-visible"
            aria-hidden="true"
          >
            <path
              d={sparkPath}
              fill="none"
              stroke={sparkColor}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {subtitle && (
        <div className="text-[11px] text-slate-500 truncate tabular-nums">{subtitle}</div>
      )}
    </div>
  );
}

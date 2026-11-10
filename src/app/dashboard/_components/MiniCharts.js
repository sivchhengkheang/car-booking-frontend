"use client";

export function AreaActivityChart({ title, subtitle, points = [] }) {
  if (!points || points.length === 0) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full min-h-[240px]">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
          No activity in selected range
        </div>
      </div>
    );
  }

  const w = 520;
  const h = 160;
  const padX = 12;
  const padY = 14;
  const maxVal = Math.max(...points.map((p) => p.value), 1);

  const coords = points.map((p, idx) => {
    const x =
      points.length === 1
        ? w / 2
        : padX + (idx / (points.length - 1)) * (w - padX * 2);
    const y = h - padY - (p.value / maxVal) * (h - padY * 2);
    return { x, y, ...p };
  });

  const linePath = coords
    .map((c, idx) => {
      if (idx === 0) return `M${c.x.toFixed(1)},${c.y.toFixed(1)}`;
      const prev = coords[idx - 1];
      const midX = ((prev.x + c.x) / 2).toFixed(1);
      return `C${midX},${prev.y.toFixed(1)} ${midX},${c.y.toFixed(1)} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
    })
    .join(" ");

  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${h - padY} L${coords[0].x.toFixed(1)},${h - padY} Z`;

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="w-full">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40 overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="dkhAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((t) => {
            const y = padY + t * (h - padY * 2);
            return (
              <line
                key={t}
                x1={padX}
                y1={y}
                x2={w - padX}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
            );
          })}
          <path d={areaPath} fill="url(#dkhAreaGrad)" />
          <path
            d={linePath}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {coords.map((c, idx) => (
            <circle
              key={`${c.label}-${idx}`}
              cx={c.x}
              cy={c.y}
              r="3"
              fill="#ffffff"
              stroke="#0284c7"
              strokeWidth="1.75"
            />
          ))}
        </svg>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 mt-1">
          {points.map((p, idx) => (
            <span key={`${p.label}-${idx}`} className="truncate">
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BarBreakdownChart({ title, headline, subtitle, items = [] }) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between h-full">
      <div className="mb-3">
        <div className="text-xs font-medium text-slate-500">{title}</div>
        {headline && (
          <div className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5 tabular-nums">
            {headline}
          </div>
        )}
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400 min-h-[140px]">
          No breakdown data
        </div>
      ) : (
        <div className="flex items-end justify-between gap-2.5 h-36 pt-2">
          {items.map((item) => {
            const pct = Math.max(8, Math.round((item.value / max) * 100));
            return (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end min-w-0">
                <span className="text-[11px] font-semibold text-slate-700 tabular-nums">
                  {item.value}
                </span>
                <div className="w-full max-w-[34px] flex-1 flex items-end">
                  <div
                    className={`w-full rounded-t-md transition-all ${item.color || "bg-slate-900"}`}
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 truncate max-w-full">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

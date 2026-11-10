"use client";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Reusable single-month calendar grid.
 * Used by Navbar date picker and Booking page calendar.
 */
export default function CalendarMonth({
  days,          // array of Date | null (nulls = padding before month start)
  year,
  month,
  monthName,
  startDate,
  endDate,
  today,
  bookedDates,   // optional: array of {start, end} Date pairs
  onDayClick,
  variant = "default", // "default" | "booking"
  activeHold,    // optional: { startDate, endDate } for booking page hold highlight
}) {
  function isSameDay(a, b) {
    if (!a || !b) return false;
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  }

  function isInRange(day, start, end) {
    if (!day || !start || !end) return false;
    const d = new Date(day); d.setHours(0, 0, 0, 0);
    const s = new Date(start); s.setHours(0, 0, 0, 0);
    const e = new Date(end); e.setHours(0, 0, 0, 0);
    return d > s && d < e;
  }

  function isPast(day) {
    if (!day || !today) return false;
    const d = new Date(day); d.setHours(0, 0, 0, 0);
    const t = new Date(today); t.setHours(0, 0, 0, 0);
    return d < t;
  }

  function isBooked(day) {
    if (!day || !bookedDates || bookedDates.length === 0) return false;
    const target = new Date(day);
    target.setHours(12, 0, 0, 0);
    return bookedDates.some((b) => {
      const s = new Date(b.start || b.startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(b.end || b.endDate); e.setHours(23, 59, 59, 999);
      return target >= s && target <= e;
    });
  }

  function isHeldByUser(day) {
    if (!day || !activeHold?.startDate || !activeHold?.endDate) return false;
    const s = new Date(activeHold.startDate); s.setHours(0, 0, 0, 0);
    const e = new Date(activeHold.endDate); e.setHours(23, 59, 59, 999);
    const t = new Date(day); t.setHours(12, 0, 0, 0);
    return t >= s && t <= e;
  }

  if (variant === "booking") {
    // Booking page style: rich colors, booked=strikethrough, hold=amber
    return (
      <div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {DAY_LABELS.map((label) => (
            <div key={label} className="text-[11px] font-bold text-slate-400 uppercase py-1">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="aspect-square" />;

            const past = isPast(day);
            const booked = isBooked(day);
            const held = isHeldByUser(day);
            const isStart = startDate && isSameDay(day, startDate);
            const isEnd = endDate && isSameDay(day, endDate);
            const inRange = isInRange(day, startDate, endDate);
            const unavailable = past || (booked && !held);

            let cls = "text-slate-800 hover:bg-blue-50 hover:text-blue-600 font-semibold cursor-pointer border border-transparent";
            if (past) cls = "text-slate-300 line-through cursor-not-allowed";
            else if (held) cls = "bg-amber-500 text-white font-bold shadow-md shadow-amber-500/30 ring-2 ring-amber-300 scale-105 z-10";
            else if (booked) cls = "bg-rose-50 text-rose-400 line-through cursor-not-allowed border border-rose-200/60 font-medium";
            else if (isStart || isEnd) cls = "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30 scale-105 z-10";
            else if (inRange) cls = "bg-blue-100 text-blue-900 font-semibold rounded-none";

            return (
              <button
                type="button"
                key={day.toISOString()}
                disabled={unavailable}
                onClick={() => onDayClick?.(day)}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs transition-all relative ${cls}`}
                title={
                  held ? "Your active reservation hold"
                  : booked ? "Already booked"
                  : past ? "Past date"
                  : isStart ? "Pick-up date"
                  : isEnd ? "Return date"
                  : "Available"
                }
              >
                <span>{day.getDate()}</span>
                {held ? (
                  <span className="w-1.5 h-1.5 bg-white rounded-full mt-0.5 animate-pulse" />
                ) : booked ? (
                  <span className="w-1 h-1 bg-rose-500 rounded-full mt-0.5" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default (Navbar) style: simpler, lighter
  return (
    <div>
      <div className="grid grid-cols-7 gap-y-4 gap-x-1 text-center mb-4">
        {DAY_LABELS.map((l) => (
          <div key={l} className="text-xs font-semibold text-gray-400">{l.charAt(0)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1 gap-x-1 text-center">
        {days.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square" />;
          const past = isPast(day);
          const isStart = startDate && isSameDay(day, startDate);
          const isEnd = endDate && isSameDay(day, endDate);
          const inRange = isInRange(day, startDate, endDate);
          return (
            <div
              key={day.toISOString()}
              className={`aspect-square flex items-center justify-center rounded-full text-sm font-semibold cursor-pointer transition-all mx-auto w-10 h-10
                ${past ? 'text-gray-300 line-through cursor-not-allowed' : 'hover:border hover:border-black text-gray-800'}
                ${isStart || isEnd ? 'bg-gray-900 text-white hover:bg-gray-900 hover:border-transparent' : ''}
                ${inRange ? 'bg-gray-100 text-gray-900 rounded-none w-full hover:border-transparent' : ''}
              `}
              onClick={() => !past && onDayClick?.(day)}
            >
              {day.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

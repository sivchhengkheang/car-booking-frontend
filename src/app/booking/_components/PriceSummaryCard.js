"use client";

export default function PriceSummaryCard({ pricePerDay, totalDays, carRentalTotal, grandTotal }) {
  if (totalDays > 0) {
    return (
      <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>
            ${pricePerDay.toFixed(2)} × {totalDays} {totalDays === 1 ? "day" : "days"}
          </span>
          <span className="font-semibold text-slate-900">${carRentalTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Insurance &amp; 250 km/day</span>
          <span className="font-medium text-emerald-700">Included</span>
        </div>
        <div className="h-px bg-slate-200 my-1.5" />
        <div className="flex justify-between items-baseline font-bold text-slate-900 text-sm">
          <span>Total</span>
          <span className="text-lg text-slate-900">${grandTotal.toFixed(2)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5 text-slate-600">
      <div className="flex justify-between">
        <span>Daily rate</span>
        <span className="font-semibold text-slate-900">${pricePerDay.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span>Insurance &amp; roadside</span>
        <span className="font-medium text-emerald-700">Included</span>
      </div>
      <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-200/70">
        Select dates to see total
      </p>
    </div>
  );
}

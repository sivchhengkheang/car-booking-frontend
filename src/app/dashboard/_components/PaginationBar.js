"use client";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function PaginationBar({
  meta,
  limit = 10,
  onPageChange,
  onLimitChange,
}) {
  if (!meta || !meta.total) return null;

  const { page = 1, totalPages = 1, total = 0 } = meta;

  return (
    <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-200/80 bg-white text-xs text-slate-600">
      <div className="text-slate-500 tabular-nums">
        {total} {total === 1 ? "record" : "records"} total
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {onLimitChange && (
          <label className="inline-flex items-center gap-2">
            <span className="font-medium text-slate-700">Rows per page</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              aria-label="Rows per page"
              className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium cursor-pointer focus:outline-hidden focus:border-slate-400"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}

        <span className="font-medium text-slate-700 tabular-nums">
          Page {page} of {totalPages}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="First page"
            className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
            className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages}
            aria-label="Last page"
            className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Reusable Breadcrumb Navigation Component
 *
 * @param {Array} items - Array of breadcrumb items:
 *   [
 *     { label: "Home", href: "/" },
 *     { label: "Sedan", href: "/" },
 *     { label: "Toyota Camry" } // Last item without href is rendered as current page
 *   ]
 * @param {string} className - Optional container styling
 */
export default function Breadcrumb({ items = [], className = "" }) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500 ${className}`}
    >
      <ol className="flex items-center flex-wrap gap-1.5 sm:gap-2 list-none p-0 m-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="inline-flex items-center gap-1.5 sm:gap-2">
              {index > 0 && (
                <ChevronRight
                  size={14}
                  strokeWidth={2}
                  className="text-slate-400 shrink-0 select-none"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                <span
                  className="font-bold text-slate-800 truncate max-w-[200px] sm:max-w-[340px] md:max-w-none"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  onClick={item.onClick}
                  className="font-normal text-slate-500 hover:text-slate-900 transition-colors"
                >
                  {item.label}
                </Link>
              ) : item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="font-normal text-slate-500 hover:text-slate-900 transition-colors cursor-pointer bg-transparent border-0 p-0"
                >
                  {item.label}
                </button>
              ) : (
                <span className="font-normal text-slate-500">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

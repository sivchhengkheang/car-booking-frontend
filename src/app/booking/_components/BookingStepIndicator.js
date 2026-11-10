"use client";
import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Dates" },
  { id: 2, label: "Review" },
  { id: 3, label: "Payment" },
];

export default function BookingStepIndicator({ currentStep = 1 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, idx) => {
        const isDone = currentStep > step.id;
        const isActive = currentStep === step.id;
        const isLast = idx === STEPS.length - 1;

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isDone
                    ? "bg-emerald-600 text-white"
                    : isActive
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : step.id}
              </div>
              <span
                className={`text-xs font-semibold ${
                  isDone ? "text-emerald-700" : isActive ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div
                className={`h-px w-8 sm:w-12 ${
                  currentStep > step.id ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

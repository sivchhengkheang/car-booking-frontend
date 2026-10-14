"use client";

const CATEGORIES = [
  { id: "ALL", label: "All Vehicles", icon: "✨" },
  { id: "Sedan", label: "Sedans", icon: "🚗" },
  { id: "SUV", label: "SUVs & 4x4", icon: "🚙" },
  { id: "Luxury", label: "Luxury & VIP", icon: "👑" },
  { id: "Electric", label: "Electric & Hybrid", icon: "⚡" },
  { id: "Truck", label: "Pickups", icon: "🛻" },
  { id: "Van", label: "Vans & MPVs", icon: "🚐" },
  { id: "Automatic", label: "Automatic Only", icon: "🕹️" },
];

export default function CategoryBar({ activeCategory, onSelectCategory }) {
  return (
    <div className="sticky top-[80px] z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 py-2.5">
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto scrollbar-none py-1">
          {CATEGORIES.map((cat) => {
            const isActive = (activeCategory || "ALL") === cat.id;
            return (
              <button
                key={cat.id}
                className={`flex flex-col items-center gap-1 bg-transparent border-b-2 text-xs font-semibold cursor-pointer whitespace-nowrap pb-2 transition-all shrink-0 ${
                  isActive
                    ? "text-blue-700 border-blue-600 opacity-100 font-bold"
                    : "text-slate-500 border-transparent hover:text-slate-900 hover:border-slate-300 opacity-80"
                }`}
                onClick={() => onSelectCategory && onSelectCategory(cat.id)}
              >
                <span className="text-xl sm:text-2xl transition-transform hover:-translate-y-0.5">
                  {cat.icon}
                </span>
                <span className="text-[11px] sm:text-xs">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

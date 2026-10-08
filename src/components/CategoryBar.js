"use client";

const CATEGORIES = [
  { id: "ALL", label: "All Vehicles", icon: "✨" },
  { id: "Sedan", label: "Sedans", icon: "🚗" },
  { id: "SUV", label: "SUVs", icon: "🚙" },
  { id: "Luxury", label: "Luxury", icon: "👑" },
  { id: "Electric", label: "Electric & EV", icon: "⚡" },
  { id: "Truck", label: "Pickups", icon: "🛻" },
  { id: "Van", label: "Vans & MPVs", icon: "🚐" },
  { id: "Convertible", label: "Convertible", icon: "🏎️" },
];

export default function CategoryBar({ activeCategory, onSelectCategory }) {
  return (
    <div className="sticky top-[80px] z-40 bg-white border-b border-gray-200 py-3">
      <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex items-center gap-8 overflow-x-auto scrollbar-none py-1">
          {CATEGORIES.map((cat) => {
            const isActive = (activeCategory || "ALL") === cat.id;
            return (
              <button
                key={cat.id}
                className={`flex flex-col items-center gap-1.5 bg-transparent border-b-2 text-xs font-semibold cursor-pointer whitespace-nowrap pb-2 transition-all flex-shrink-0 ${isActive
                    ? "text-gray-900 border-gray-900 opacity-100"
                    : "text-gray-500 border-transparent hover:text-gray-900 hover:border-gray-300 opacity-75"
                  }`}
                onClick={() => onSelectCategory && onSelectCategory(cat.id)}
              >
                <span className="text-2xl transition-transform hover:-translate-y-0.5">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

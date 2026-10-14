// Updated by Antigravity
"use client";
import { useState, useMemo } from "react";
import { Crosshair, Heart } from "lucide-react";
import Link from "next/link";
import CarCard from "./CarCard";
import { getCarPhotoUrl } from "@/lib/api";

// Approximate coordinates for Cambodia locations relative to SVG map
const CITY_COORDS = {
  "Phnom Penh": { x: 55, y: 65 },
  "Siem Reap": { x: 35, y: 30 },
  "Sihanoukville": { x: 30, y: 80 },
  "Battambang": { x: 25, y: 45 },
  "Kampot": { x: 45, y: 85 },
};

export default function CarMapExplorer({ cars = [] }) {
  const [selectedCarId, setSelectedCarId] = useState(null);
  const [hoveredCarId, setHoveredCarId] = useState(null);

  // Distribute cars across map coordinates
  const mappedCars = useMemo(() => {
    return cars.map((car, idx) => {
      const city = car.location?.city || "Phnom Penh";
      const baseCoord = CITY_COORDS[city] || CITY_COORDS["Phnom Penh"];
      // Add slight jitter so pins don't overlap completely
      const jitterX = ((idx * 8) % 15) - 7;
      const jitterY = ((idx * 6) % 15) - 7;
      return {
        ...car,
        mapX: Math.min(95, Math.max(5, baseCoord.x + jitterX)),
        mapY: Math.min(95, Math.max(5, baseCoord.y + jitterY)),
      };
    });
  }, [cars]);

  const activeCar = useMemo(() => {
    return mappedCars.find((c) => (c._id || c.id) === (selectedCarId || hoveredCarId));
  }, [mappedCars, selectedCarId, hoveredCarId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 items-start">
      {/* Left: Scrollable Cars Grid */}
      <div className="space-y-4 pr-1">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            Over {cars.length > 0 ? cars.length : "1,000"} cars within map area
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">🏷️ Prices include all fees</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {cars.map((car, idx) => {
            const carId = car._id || car.id;
            const isSelected = carId === selectedCarId || carId === hoveredCarId;
            return (
              <div
                key={carId || idx}
                onMouseEnter={() => setHoveredCarId(carId)}
                onMouseLeave={() => setHoveredCarId(null)}
                className={`transition-all duration-200 rounded-2xl ${
                  isSelected ? "ring-2 ring-slate-900 shadow-xl" : ""
                }`}
              >
                <CarCard car={car} index={idx} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Sticky Interactive Map */}
      <div className="sticky top-28 h-[calc(100vh-140px)] min-h-[600px] rounded-3xl overflow-hidden bg-[#EAE8E3] shadow-md flex flex-col relative border border-slate-200 group">
        {/* Map Canvas Visual - Light Mode (Google Maps Style) */}
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#F0EEEB]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            {/* Base land color */}
            <rect width="100%" height="100%" fill="#F0EEEB" />
            
            {/* Parks / Greenery */}
            <path d="M 10 10 Q 50 30, 80 10 T 150 40 Q 180 80, 140 120 T 40 180 Z" fill="#D3E6CC" opacity="0.7" />
            <path d="M 600 500 Q 650 480, 700 550 T 800 600 Q 750 650, 650 620 Z" fill="#D3E6CC" opacity="0.7" />
            <path d="M 300 200 Q 350 180, 400 250 T 350 350 Q 250 300, 280 250 Z" fill="#D3E6CC" opacity="0.7" />
            <path d="M 700 100 Q 750 80, 800 150 T 750 250 Q 650 200, 680 150 Z" fill="#D3E6CC" opacity="0.7" />

            {/* Rivers / Water */}
            <path
              d="M 0 350 Q 150 400, 250 350 T 500 450 T 800 550 T 1000 500"
              fill="none"
              stroke="#A3CCFF"
              strokeWidth="45"
              strokeLinecap="round"
              opacity="0.8"
            />
            <path
              d="M 400 0 Q 450 150, 500 250 T 600 450"
              fill="none"
              stroke="#A3CCFF"
              strokeWidth="20"
              strokeLinecap="round"
              opacity="0.8"
            />
            <path
              d="M 800 0 Q 820 150, 900 250 T 950 450"
              fill="none"
              stroke="#A3CCFF"
              strokeWidth="15"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* Major Highways */}
            <path
              d="M -50 150 Q 100 200, 300 150 T 700 250 T 1100 200"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M -50 150 Q 100 200, 300 150 T 700 250 T 1100 200"
              fill="none"
              stroke="#FAD277"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.9"
            />

            <path
              d="M 200 -50 Q 250 200, 200 400 T 250 800"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M 200 -50 Q 250 200, 200 400 T 250 800"
              fill="none"
              stroke="#FAD277"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Secondary Roads */}
            <path d="M 0 50 L 1000 250" fill="none" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M 100 0 L 300 800" fill="none" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M 400 0 L 200 800" fill="none" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M 0 600 L 1000 400" fill="none" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M 600 0 L 800 800" fill="none" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M 0 250 L 1000 550" fill="none" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M 300 0 L 600 800" fill="none" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M 500 0 L 400 800" fill="none" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M 800 0 L 600 800" fill="none" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M 0 700 L 1000 600" fill="none" stroke="#FFFFFF" strokeWidth="4" />
            <path d="M 0 100 L 1000 300" fill="none" stroke="#FFFFFF" strokeWidth="4" />
          </svg>

          {/* District Labels */}
          <div className="absolute top-[34%] left-[38%] text-xs font-bold text-slate-500/70 tracking-wide pointer-events-none drop-shadow-sm">
            Siem Reap
          </div>
          <div className="absolute top-[68%] left-[54%] text-xs font-bold text-slate-500/70 tracking-wide pointer-events-none drop-shadow-sm">
            Phnom Penh
          </div>
          <div className="absolute top-[80%] left-[34%] text-xs font-bold text-slate-500/70 tracking-wide pointer-events-none drop-shadow-sm">
            Sihanoukville
          </div>
          <div className="absolute top-[36%] left-[24%] text-xs font-bold text-slate-500/70 tracking-wide pointer-events-none drop-shadow-sm">
            Battambang
          </div>
          <div className="absolute top-[18%] left-[64%] text-xs font-bold text-slate-500/70 tracking-wide pointer-events-none drop-shadow-sm">
            Kampong Cham
          </div>
        </div>

        {/* Map Controls (Top Right) */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <div className="bg-white rounded-md shadow-md overflow-hidden flex flex-col border border-slate-200">
            <button className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-b border-slate-200 cursor-pointer text-lg font-medium transition-colors">
              +
            </button>
            <button className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer text-lg font-medium transition-colors">
              −
            </button>
          </div>
          <button className="w-8 h-8 bg-white rounded-md shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-colors" title="My location">
            <Crosshair size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Interactive Price Pins */}
        {mappedCars.map((car, idx) => {
          const carId = car._id || car.id;
          const isSelected = carId === selectedCarId || carId === hoveredCarId;

          return (
            <button
              key={carId || idx}
              onClick={() => setSelectedCarId(carId)}
              onMouseEnter={() => setHoveredCarId(carId)}
              onMouseLeave={() => setHoveredCarId(null)}
              style={{
                left: `${car.mapX}%`,
                top: `${car.mapY}%`,
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-[20px] text-sm font-extrabold shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center min-w-[46px] border border-transparent z-20 ${
                isSelected
                  ? "bg-slate-900 text-white z-40 scale-110 shadow-xl border-slate-800"
                  : "bg-white text-slate-900 hover:scale-105 hover:z-30 hover:shadow-lg border-slate-200"
              }`}
            >
              ${car.pricePerDay || 35}
            </button>
          );
        })}

        {/* Floating Selected Car Card Popover inside Map */}
        {activeCar && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[340px] bg-white rounded-2xl p-3 shadow-2xl border border-slate-200 z-50 animate-fade-in flex gap-3 items-center group/card cursor-pointer" onClick={() => document.getElementById(`link-car-${activeCar._id || activeCar.id}`)?.click()}>
            <div className="w-24 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative">
              <img
                src={getCarPhotoUrl(activeCar.photos?.[0])}
                alt={activeCar.modelName || "Car"}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
              />
              {activeCar.isFavorite && (
                 <div className="absolute top-1.5 right-1.5 text-white bg-slate-900/20 rounded-full p-0.5">
                    <Heart size={12} fill="currentColor" stroke="none" />
                 </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                 <h5 className="font-bold text-sm text-slate-900 truncate">
                   {activeCar.brand || activeCar.make} {activeCar.modelName || activeCar.model}
                 </h5>
                 <div className="flex items-center gap-0.5 text-xs">
                    <span className="text-slate-900 font-semibold">★ 4.88</span>
                 </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {activeCar.category || "Sedan"} · 📍 {activeCar.location?.city || "Phnom Penh"}
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="font-extrabold text-slate-900 text-[13px]">
                  ${activeCar.pricePerDay}
                </span>
                <span className="text-xs text-slate-500">night</span>
              </div>
            </div>
            <Link
              id={`link-car-${activeCar._id || activeCar.id}`}
              href={`/booking?carId=${activeCar._id || activeCar.id}`}
              className="hidden"
            >
              View
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

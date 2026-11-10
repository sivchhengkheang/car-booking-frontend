"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  MapPin,
  Navigation,
  Crosshair,
  Plus,
  Minus,
  ExternalLink,
  Star,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import CarCard from "./CarCard";
import { getCarPhotoUrl } from "@/lib/api";
import { useSearch } from "@/context/SearchContext";

// Real center coordinates for Cambodia cities & provinces
const CAMBODIA_CENTERS = [
  { names: ["phnom penh", "daun penh", "toul kork", "chamkar mon", "sen sok", "chroy changvar"], label: "Phnom Penh", lat: 11.5564, lng: 104.9282 },
  { names: ["siem reap", "angkor"], label: "Siem Reap", lat: 13.3633, lng: 103.8564 },
  { names: ["sihanoukville", "preah sihanouk", "kampong som"], label: "Sihanoukville", lat: 10.6275, lng: 103.5239 },
  { names: ["battambang"], label: "Battambang", lat: 13.0957, lng: 103.2022 },
  { names: ["kampot"], label: "Kampot", lat: 10.6104, lng: 104.1815 },
  { names: ["kep"], label: "Kep", lat: 10.4829, lng: 104.3167 },
  { names: ["kampong cham"], label: "Kampong Cham", lat: 11.9934, lng: 105.4635 },
  { names: ["kampong chhnang"], label: "Kampong Chhnang", lat: 12.25, lng: 104.6667 },
  { names: ["kampong speu"], label: "Kampong Speu", lat: 11.4533, lng: 104.5209 },
  { names: ["kampong thom"], label: "Kampong Thom", lat: 12.7111, lng: 104.8887 },
  { names: ["kandal", "ta khmau", "takhmao"], label: "Kandal", lat: 11.4833, lng: 104.95 },
  { names: ["koh kong"], label: "Koh Kong", lat: 11.6153, lng: 102.9838 },
  { names: ["kratie"], label: "Kratie", lat: 12.4881, lng: 106.0188 },
  { names: ["mondulkiri", "sen monorom"], label: "Mondulkiri", lat: 12.4558, lng: 107.1881 },
  { names: ["oddar meanchey", "samraong"], label: "Oddar Meanchey", lat: 14.1818, lng: 103.5176 },
  { names: ["pailin"], label: "Pailin", lat: 12.8489, lng: 102.6093 },
  { names: ["preah vihear"], label: "Preah Vihear", lat: 13.8073, lng: 104.9805 },
  { names: ["prey veng"], label: "Prey Veng", lat: 11.4868, lng: 105.3253 },
  { names: ["pursat"], label: "Pursat", lat: 12.5388, lng: 103.9192 },
  { names: ["ratanakiri", "banlung"], label: "Ratanakiri", lat: 13.7394, lng: 106.9873 },
  { names: ["stung treng"], label: "Stung Treng", lat: 13.5259, lng: 105.9683 },
  { names: ["svay rieng", "bavet"], label: "Svay Rieng", lat: 11.0879, lng: 105.7993 },
  { names: ["takeo"], label: "Takeo", lat: 10.9908, lng: 104.785 },
  { names: ["tboung khmum"], label: "Tboung Khmum", lat: 11.8891, lng: 105.6709 },
  { names: ["banteay meanchey", "poipet", "sisophon"], label: "Banteay Meanchey", lat: 13.5859, lng: 102.9737 },
];

const DEFAULT_CENTER = CAMBODIA_CENTERS[0]; // Phnom Penh

function resolveCarCenter(car) {
  const haystack = `${car?.location?.city || ""} ${car?.location?.province || ""} ${car?.location?.address || ""}`
    .trim()
    .toLowerCase();

  const matched = CAMBODIA_CENTERS.find((c) =>
    c.names.some((alias) => haystack.includes(alias))
  );

  if (matched) {
    return { label: matched.label, lat: matched.lat, lng: matched.lng };
  }

  const lat = Number(car?.location?.latitude);
  const lng = Number(car?.location?.longitude);
  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
    return {
      label: car?.location?.city || "Cambodia",
      lat,
      lng,
    };
  }

  return { label: DEFAULT_CENTER.label, lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng };
}

export default function CarMapExplorer({ cars = [] }) {
  const { getBookingUrl } = useSearch();
  const [selectedCarId, setSelectedCarId] = useState(null);
  const [hoveredCarId, setHoveredCarId] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [zoom, setZoom] = useState(13);
  const [isNavigating, setIsNavigating] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const mappedCars = useMemo(() => {
    return cars.map((car) => {
      const center = resolveCarCenter(car);
      return {
        ...car,
        centerLabel: center.label,
        centerLat: center.lat,
        centerLng: center.lng,
      };
    });
  }, [cars]);

  const cityGroups = useMemo(() => {
    const map = new Map();
    mappedCars.forEach((c) => {
      const existing = map.get(c.centerLabel);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(c.centerLabel, {
          label: c.centerLabel,
          lat: c.centerLat,
          lng: c.centerLng,
          count: 1,
        });
      }
    });
    return Array.from(map.values());
  }, [mappedCars]);

  const activeCar = useMemo(() => {
    const targetId = hoveredCarId || selectedCarId;
    if (targetId) {
      return mappedCars.find((c) => (c._id || c.id) === targetId) || mappedCars[0] || null;
    }
    if (selectedCity) {
      return mappedCars.find((c) => c.centerLabel === selectedCity) || mappedCars[0] || null;
    }
    return mappedCars[0] || null;
  }, [mappedCars, hoveredCarId, selectedCarId, selectedCity]);

  const activeCenter = useMemo(() => {
    if (selectedCity && !hoveredCarId) {
      const foundCity = cityGroups.find((g) => g.label === selectedCity);
      if (foundCity) return foundCity;
    }
    if (activeCar) {
      return {
        label: activeCar.centerLabel,
        lat: activeCar.centerLat,
        lng: activeCar.centerLng,
      };
    }
    return DEFAULT_CENTER;
  }, [selectedCity, hoveredCarId, cityGroups, activeCar]);

  // Debounced coordinates for Google Maps iframe so fast card hovers animate smoothly without stutter
  const [mapTarget, setMapTarget] = useState(() => ({
    label: activeCenter.label,
    lat: activeCenter.lat,
    lng: activeCenter.lng,
    zoom: 13,
  }));

  const prevCoordsRef = useRef(`${activeCenter.lat},${activeCenter.lng},${zoom}`);

  useEffect(() => {
    const nextKey = `${activeCenter.lat},${activeCenter.lng},${zoom}`;
    if (nextKey === prevCoordsRef.current) return;
    prevCoordsRef.current = nextKey;

    let active = true;
    Promise.resolve().then(() => {
      if (active) setIsNavigating(true);
    });

    const timer = setTimeout(() => {
      if (!active) return;
      setIframeLoaded(false);
      setMapTarget({
        label: activeCenter.label,
        lat: activeCenter.lat,
        lng: activeCenter.lng,
        zoom,
      });
    }, 180);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [activeCenter.label, activeCenter.lat, activeCenter.lng, zoom]);

  const mapEmbedUrl = `https://maps.google.com/maps?q=${mapTarget.lat},${mapTarget.lng}&ll=${mapTarget.lat},${mapTarget.lng}&z=${mapTarget.zoom}&t=m&output=embed`;
  const externalGoogleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${activeCenter.lat},${activeCenter.lng}`;

  const handleHoverCar = (car) => {
    const id = car._id || car.id;
    setHoveredCarId(id);
    setSelectedCity(null);
  };

  const handleSelectCar = (car) => {
    const id = car._id || car.id;
    setSelectedCarId(id);
    setSelectedCity(null);
    setZoom((z) => Math.max(z, 13));
  };

  const handleSelectCityChip = (group) => {
    setSelectedCity(group.label);
    setSelectedCarId(null);
    setHoveredCarId(null);
    setZoom(13);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 items-start">
      {/* Left: Scrollable Cars Grid */}
      <div className="space-y-4 pr-1">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            {cars.length} {cars.length === 1 ? "vehicle" : "vehicles"} available
          </h2>
          <span className="text-xs text-slate-500">Hover a car to locate its city center</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {mappedCars.map((car, idx) => {
            const carId = car._id || car.id;
            const isActive =
              carId === hoveredCarId || (!hoveredCarId && carId === (activeCar?._id || activeCar?.id));

            return (
              <div
                key={carId || idx}
                onMouseEnter={() => handleHoverCar(car)}
                onMouseLeave={() => setHoveredCarId(null)}
                onClick={() => handleSelectCar(car)}
                className={`transition-all duration-200 rounded-2xl ${
                  isActive ? "ring-2 ring-blue-600 shadow-lg" : ""
                }`}
              >
                <CarCard car={car} index={idx} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Sticky Google Maps Explorer */}
      <div className="sticky top-28 h-[calc(100vh-140px)] min-h-[560px] rounded-2xl overflow-hidden bg-slate-100 shadow-sm flex flex-col relative border border-slate-200">
        {/* Google Maps Iframe */}
        <iframe
          key={mapEmbedUrl}
          title={`Google Maps — ${mapTarget.label}`}
          src={mapEmbedUrl}
          onLoad={() => {
            setIframeLoaded(true);
            setIsNavigating(false);
          }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-300 ${
            iframeLoaded ? "opacity-100" : "opacity-85"
          }`}
        />

        {/* Animated Navigation Radar Overlay when hovering / switching city */}
        {isNavigating && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center bg-slate-900/10 backdrop-blur-[1px] transition-opacity">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-24 h-24 rounded-full bg-blue-500/25 animate-ping" />
              <span className="absolute w-14 h-14 rounded-full bg-blue-600/30 animate-pulse" />
              <div className="relative flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-xl border border-white/20">
                <Navigation className="w-3.5 h-3.5 text-blue-400 animate-bounce" />
                <span>Navigating to {activeCenter.label}…</span>
              </div>
            </div>
          </div>
        )}

        {/* Top Left: City / Province Center Pin Banner & Quick Hub Chips */}
        <div className="relative z-30 p-3.5 flex flex-col gap-2 pointer-events-none">
          <div className="flex items-start justify-between gap-2">
            <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 ${
                    hoveredCarId || isNavigating ? "animate-ping" : ""
                  }`}
                />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{activeCenter.label} Center</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 tabular-nums">
                  {activeCenter.lat.toFixed(4)}° N, {activeCenter.lng.toFixed(4)}° E
                </div>
              </div>
            </div>

            {/* Map Controls (Top Right) */}
            <div className="pointer-events-auto flex flex-col gap-1.5">
              <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-md overflow-hidden flex flex-col border border-slate-200">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(17, z + 1))}
                  className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-50 border-b border-slate-200 cursor-pointer"
                  aria-label="Zoom in"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(7, z - 1))}
                  className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-50 cursor-pointer"
                  aria-label="Zoom out"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setZoom(13);
                  setMapTarget({
                    label: activeCenter.label,
                    lat: activeCenter.lat,
                    lng: activeCenter.lng,
                    zoom: 13,
                  });
                }}
                className="w-8 h-8 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 cursor-pointer"
                title={`Center on ${activeCenter.label}`}
                aria-label="Center map"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>
              <a
                href={externalGoogleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50"
                title="Open in Google Maps"
                aria-label="Open in Google Maps"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* City / Province Chips */}
          {cityGroups.length > 0 && (
            <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap max-w-[calc(100%-48px)]">
              {cityGroups.map((group) => {
                const active = activeCenter.label === group.label;
                return (
                  <button
                    key={group.label}
                    type="button"
                    onClick={() => handleSelectCityChip(group)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm border transition-all cursor-pointer ${
                      active
                        ? "bg-slate-900 text-white border-slate-900 scale-[1.03]"
                        : "bg-white/95 text-slate-700 border-slate-200 hover:bg-white"
                    }`}
                  >
                    {group.label} ({group.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Active Car Preview Card at Bottom */}
        {activeCar && (
          <Link
            href={
              getBookingUrl
                ? getBookingUrl(activeCar._id || activeCar.id)
                : `/booking?carId=${activeCar._id || activeCar.id}`
            }
            className={`mt-auto relative z-30 m-4 ml-auto mr-auto w-[92%] max-w-[350px] bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-xl border transition-all duration-200 flex gap-3 items-center no-underline text-inherit ${
              hoveredCarId
                ? "border-blue-500 ring-2 ring-blue-500/20 -translate-y-0.5"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="w-20 h-15 rounded-xl overflow-hidden bg-slate-100 shrink-0">
              <img
                src={getCarPhotoUrl(activeCar.photos?.[0])}
                alt={activeCar.modelName || "Car"}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h5 className="font-bold text-sm text-slate-900 truncate">
                  {activeCar.brand || activeCar.make} {activeCar.modelName || activeCar.model}
                </h5>
                {activeCar.averageRating ? (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-800 shrink-0">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {Number(activeCar.averageRating).toFixed(1)}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {activeCar.centerLabel} · {activeCar.category || "Sedan"}
              </p>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-slate-900 text-sm">
                    ${activeCar.pricePerDay}
                  </span>
                  <span className="text-xs text-slate-500">/ day</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                  <span>Book</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}

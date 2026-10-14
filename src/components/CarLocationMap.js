"use client";
import { useState } from "react";

const CITY_HUBS = {
  "Phnom Penh": {
    pinX: 54,
    pinY: 52,
    hubName: "Phnom Penh Central Fleet Hub",
    district: "Daun Penh & Toul Kork Delivery Zone",
    airportDistance: "15 mins (8.5 km) to Phnom Penh Int'l Airport (PNH)",
    lat: 11.562108,
    lng: 104.916010,
  },
  "Siem Reap": {
    pinX: 44,
    pinY: 36,
    hubName: "Siem Reap Angkor Gateway Hub",
    district: "National Road 6 & Wat Bo Area",
    airportDistance: "35 mins to Siem Reap Angkor Int'l Airport (SAI)",
    lat: 13.3633,
    lng: 103.8564,
  },
  "Sihanoukville": {
    pinX: 42,
    pinY: 76,
    hubName: "Sihanoukville Coastal Terminal",
    district: "Ekareach Street & Ochheuteal Zone",
    airportDistance: "20 mins to Sihanoukville Airport (KOS)",
    lat: 10.6275,
    lng: 103.5239,
  },
  "Battambang": {
    pinX: 34,
    pinY: 38,
    hubName: "Battambang Heritage Hub",
    district: "Sangkae River Promenade",
    airportDistance: "10 mins from Royal Railway Station",
    lat: 13.0957,
    lng: 103.2022,
  },
  "Kampot": {
    pinX: 50,
    pinY: 82,
    hubName: "Kampot Riverfront Station",
    district: "Old Market & Salt Fields Zone",
    airportDistance: "Central Pickup Spot",
    lat: 10.6104,
    lng: 104.1815,
  },
};

export default function CarLocationMap({
  car,
  city = "Phnom Penh",
  brand = "Toyota",
  model = "Camry",
  price = 35,
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showDirections, setShowDirections] = useState(false);

  // Normalize city name or default to Phnom Penh
  const matchedCityKey =
    Object.keys(CITY_HUBS).find((k) =>
      city?.toLowerCase().includes(k.toLowerCase())
    ) || "Phnom Penh";

  const hub = CITY_HUBS[matchedCityKey];
  const address =
    car?.location?.address || `${hub.district}, ${matchedCityKey}, Cambodia`;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${brand} ${model} rental ${address}`
  )}`;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 1.75));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));

  return (
    <div className="relative flex flex-col h-full min-h-[380px] sm:min-h-[440px] rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md text-white">
      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-lg">
            📍
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-100">{hub.hubName}</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                Live Location
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[260px] sm:max-w-md">
              {address}
            </p>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl p-1 border border-slate-700/60">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-7 h-7 rounded-lg hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-7 h-7 rounded-lg hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
            title="Zoom Out"
          >
            −
          </button>
        </div>
      </div>

      {/* Map Canvas with Stylized Vector Roads & Satellite Terrain */}
      <div className="relative flex-1 bg-[#0b1329] overflow-hidden select-none">
        {/* Transformable Canvas based on zoom */}
        <div
          className="w-full h-full relative transition-transform duration-300 origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Vector Map Topology */}
          <svg
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Subtle Road Grid */}
              <pattern id="roadGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.3" />
              </pattern>
              {/* Water Gradient */}
              <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.15" />
              </linearGradient>
            </defs>

            {/* Base Background */}
            <rect width="100" height="100" fill="#0b1329" />
            <rect width="100" height="100" fill="url(#roadGrid)" />

            {/* Stylized River / Mekong curve */}
            <path
              d="M 20 0 Q 35 30, 48 50 T 80 100"
              fill="none"
              stroke="url(#waterGrad)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M 50 50 Q 60 70, 75 100"
              fill="none"
              stroke="url(#waterGrad)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Major Arteries / Expressways */}
            <path d="M 0 52 L 100 52" stroke="#334155" strokeWidth="0.8" strokeDasharray="1,1" />
            <path d="M 54 0 L 54 100" stroke="#334155" strokeWidth="0.8" strokeDasharray="1,1" />
            <path d="M 10 10 L 90 90" stroke="#1e293b" strokeWidth="0.6" />
            <path d="M 90 10 L 10 90" stroke="#1e293b" strokeWidth="0.6" />

            {/* Radius delivery zone circle */}
            <circle
              cx={hub.pinX}
              cy={hub.pinY}
              r="18"
              fill="#2563eb"
              fillOpacity="0.08"
              stroke="#3b82f6"
              strokeWidth="0.4"
              strokeDasharray="2,1"
            />
          </svg>

          {/* Car Location Marker Pin */}
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
            style={{ left: `${hub.pinX}%`, top: `${hub.pinY}%` }}
          >
            {/* Animated Pulse Waves */}
            <span className="absolute -inset-4 rounded-full bg-blue-500/25 animate-ping" />
            <span className="absolute -inset-2 rounded-full bg-blue-500/35 animate-pulse" />

            {/* Pin Badge */}
            <div className="relative flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3.5 py-1.5 rounded-full shadow-2xl border-2 border-white/90 transition-transform duration-200 group-hover:scale-110">
              <span className="text-xs">🚗</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-extrabold uppercase tracking-wider leading-none">
                  {brand} {model}
                </span>
                <span className="text-[9px] text-blue-200 font-semibold leading-tight">
                  ${price}/day · Ready
                </span>
              </div>
            </div>

            {/* Pointer notch */}
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-indigo-600 mx-auto -mt-0.5 drop-shadow-md" />
          </div>

          {/* Nearby Airport / Delivery Hub Pin */}
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: `${hub.pinX + 16}%`, top: `${hub.pinY - 14}%` }}
          >
            <div className="flex items-center gap-1.5 bg-slate-800/90 backdrop-blur-sm text-slate-300 px-2.5 py-1 rounded-full text-[10px] font-bold border border-slate-700 shadow-md">
              <span>✈️</span>
              <span>Airport Delivery Hub</span>
            </div>
          </div>
        </div>

        {/* Airport & Handover Feature Banner */}
        <div className="absolute bottom-14 left-4 right-4 z-10">
          <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="text-base">🚀</span>
              <div>
                <div className="font-bold text-slate-200">{hub.airportDistance}</div>
                <div className="text-[11px] text-slate-400">
                  Instant curbside pickup or hotel delivery available
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDirections(!showDirections)}
              className="px-3 py-1.5 rounded-full bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-[11px] font-bold border border-blue-500/30 transition-colors cursor-pointer"
            >
              {showDirections ? "Hide Info" : "View Logistics"}
            </button>
          </div>
        </div>

        {/* Expanded Logistics Modal Layer if toggled */}
        {showDirections && (
          <div className="absolute inset-x-4 top-16 bottom-14 bg-slate-950/95 backdrop-blur-lg border border-slate-800 rounded-2xl p-4 z-30 overflow-y-auto animate-in fade-in duration-200 text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                Pickup &amp; Handover Details
              </span>
              <button
                type="button"
                onClick={() => setShowDirections(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-slate-300 text-[11px]">
              <div className="flex items-start gap-2">
                <span>🏢</span>
                <div>
                  <strong className="text-white">Central Hub:</strong> {hub.hubName}
                  <div className="text-slate-400">{address}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span>✈️</span>
                <div>
                  <strong className="text-white">Terminal Meet &amp; Greet:</strong> Handover at arrivals terminal parking with pre-trip digital inspection.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span>🛡️</span>
                <div>
                  <strong className="text-white">Handover Check:</strong> Mileage and fuel are verified in-app before releasing the keys.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Bar */}
      <div className="p-3 sm:px-5 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-between gap-3 text-xs z-10">
        <div className="flex items-center gap-2 text-slate-400 text-[11px] truncate">
          <span>Coordinates: {hub.lat.toFixed(4)}° N, {hub.lng.toFixed(4)}° E</span>
        </div>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <span>Open Google Maps</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { getCarPhotoUrl } from "@/lib/api";
import { useBasket } from "@/context/BasketContext";

const SAMPLE_CAR_PHOTOS = [
  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=800&q=80",
];

export default function CarCard({ car, index = 0 }) {
  const { toggleWishlist, isWishlisted, addToBasket, toggleCompare, isInCompare } = useBasket();
  const [photoIndex, setPhotoIndex] = useState(0);

  const carId = car._id || car.id;
  const wishlisted = isWishlisted(carId);
  const compared = isInCompare(carId);

  const photos =
    car?.photos && car.photos.length > 0
      ? car.photos
      : [SAMPLE_CAR_PHOTOS[index % SAMPLE_CAR_PHOTOS.length]];

  const currentPhoto = getCarPhotoUrl(photos[photoIndex % photos.length], index);

  const brand = car.brand || car.make || "Vehicle";
  const model = car.modelName || car.model || "Model";
  const city = car.location?.city || car.location?.address || "Phnom Penh";
  const category = car.category || "Sedan";
  const transmission = car.transmission || "Automatic";
  const seats = car.seats || 5;
  const fuel = car.fuelType || "Gasoline";
  const price = car.pricePerDay || 35;
  const rating = 4.85 + ((index * 3) % 15) / 100;
  const tripCount = 35 + ((index * 17) % 150);

  // Status tag logic
  const isScarce = index % 3 === 0;

  const handleNextPhoto = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrevPhoto = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Default 2 days starting tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 3);

    addToBasket({
      car,
      startDate: tomorrow.toISOString(),
      endDate: returnDate.toISOString(),
      addOns: [],
    });
  };

  return (
    <div className="flex flex-col group relative bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-slate-300 transition-all duration-300 p-2.5">
      {/* Photo carousel container */}
      <div className="relative w-full aspect-[20/15] rounded-xl overflow-hidden bg-slate-100">
        <Link href={`/booking?carId=${carId}`} className="block w-full h-full">
          <img
            src={currentPhoto}
            alt={`${brand} ${model}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.target.src = SAMPLE_CAR_PHOTOS[index % SAMPLE_CAR_PHOTOS.length];
            }}
          />
        </Link>

        {/* Carousel Prev/Next Buttons */}
        {photos.length > 1 && (
          <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <button
              onClick={handlePrevPhoto}
              className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center text-xs shadow-md pointer-events-auto cursor-pointer transition-transform hover:scale-110"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              onClick={handleNextPhoto}
              className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center text-xs shadow-md pointer-events-auto cursor-pointer transition-transform hover:scale-110"
              aria-label="Next photo"
            >
              ›
            </button>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
          {price >= 65 ? (
            <span className="bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs border border-white/10">
              👑 Luxury
            </span>
          ) : price <= 30 ? (
            <span className="bg-emerald-600/95 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
              🏷️ Good Price
            </span>
          ) : (
            <span className="bg-white/95 backdrop-blur-xs text-slate-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs border border-slate-200">
              ★ Top Pick
            </span>
          )}
        </div>

        {/* Top Right Actions: Compare & Wishlist */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          <button
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-transform hover:scale-110 cursor-pointer shadow-sm ${
              compared ? "bg-indigo-600 text-white" : "bg-white/90 hover:bg-white text-slate-700"
            }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleCompare(car);
            }}
            title={compared ? "Comparing" : "Compare"}
          >
            ⚖️
          </button>

          <button
            className="w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-sm cursor-pointer transition-transform hover:scale-110 shadow-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(car);
            }}
            aria-label="Wishlist"
            title="Save"
          >
            {wishlisted ? "❤️" : "🤍"}
          </button>
        </div>

        {/* Status tag on photo bottom */}
        <div className="absolute bottom-2.5 left-2.5 z-10">
          {isScarce ? (
            <span className="bg-amber-500/95 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs">
              🔥 Almost full!
            </span>
          ) : (
            <span className="bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Open
            </span>
          )}
        </div>
      </div>

      {/* Details info */}
      <div className="p-2 flex flex-col flex-1 justify-between">
        <Link href={`/booking?carId=${carId}`} className="no-underline text-inherit block">
          <div className="flex items-start justify-between gap-1 mb-1">
            <h3 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors truncate">
              {brand} {model} <span className="text-slate-400 font-normal text-xs">({car.year || 2024})</span>
            </h3>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800 shrink-0">
              <span className="text-amber-500">★</span>
              <span>{rating.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 mb-2 truncate">
            {transmission} · {seats} seats · {fuel} · 📍 {city}
          </div>
        </Link>

        {/* Pricing line & Quick Add action */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-auto">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-extrabold text-slate-900 text-base">${price}</span>
              <span className="font-medium text-slate-500 text-xs">/ day</span>
            </div>
            <div className="text-[10px] text-slate-400">
              ★ {rating.toFixed(1)} ({tripCount} trips)
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleQuickAdd}
              className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Add to basket"
            >
              <span>+</span>
              <span>Add</span>
            </button>
            <Link
              href={`/booking?carId=${carId}`}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-700 text-white text-[11px] font-bold transition-all no-underline"
            >
              Book
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

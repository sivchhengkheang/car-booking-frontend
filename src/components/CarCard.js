"use client";
import { useState } from "react";
import Link from "next/link";

const SAMPLE_CAR_PHOTOS = [
  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80"
];

export default function CarCard({ car, index = 0 }) {
  const [isWishlisted, setIsWishlisted] = useState(false);

  const photo =
    car?.photos && car.photos.length > 0 && car.photos[0]
      ? car.photos[0]
      : SAMPLE_CAR_PHOTOS[index % SAMPLE_CAR_PHOTOS.length];

  const brand = car.brand || car.make || "Vehicle";
  const model = car.modelName || car.model || "Model";
  const city = car.location?.city || car.location?.address || "Phnom Penh, Cambodia";

  return (
    <Link href={`/booking?carId=${car._id}`} className="flex flex-col text-inherit no-underline cursor-pointer group">
      <div className="relative w-full aspect-[20/19] rounded-2xl overflow-hidden bg-gray-100 mb-3">
        <img
          src={photo}
          alt={`${brand} ${model}`}
          className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            e.target.src = SAMPLE_CAR_PHOTOS[0];
          }}
        />

        {/* Guest Favorite Badge */}
        {car.pricePerDay >= 45 && (
          <div className="absolute top-3 left-3 z-10 bg-white/95 text-gray-900 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-sm border border-black/5">
            Guest favorite
          </div>
        )}

        {/* Wishlist Heart Icon */}
        <button
          className="absolute top-3 right-3 z-10 bg-transparent border-0 w-8.5 h-8.5 flex items-center justify-center text-xl cursor-pointer transition-transform hover:scale-125"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsWishlisted(!isWishlisted);
          }}
          aria-label="Wishlist"
        >
          {isWishlisted ? "❤️" : "🤍"}
        </button>
      </div>

      <div className="flex items-start justify-between gap-2 mb-0.5">
        <div className="text-[15px] font-bold text-gray-900 leading-tight">
          {brand} {model} ({car.year || 2024})
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-gray-900 flex-shrink-0">
          <span>★</span>
          <span>4.92</span>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-1">
        {city} · {car.transmission || "Automatic"} · {car.seats || 5} seats
      </div>

      <div className="text-xs mt-1">
        <span className="font-extrabold text-gray-900 text-base">${car.pricePerDay}</span>
        <span className="font-normal text-gray-500 text-xs"> / day</span>
      </div>
    </Link>
  );
}

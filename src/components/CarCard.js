"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, ChevronLeft, ChevronRight, Star, MapPin } from "lucide-react";
import { getCarPhotoUrl } from "@/lib/api";
import { useBasket } from "@/context/BasketContext";
import { useSearch } from "@/context/SearchContext";

const SAMPLE_CAR_PHOTOS = [
  "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=800&q=80",
];

export default function CarCard({ car, index = 0 }) {
  const { toggleWishlist, isWishlisted } = useBasket();
  const { getBookingUrl } = useSearch();
  const [photoIndex, setPhotoIndex] = useState(0);

  const carId = car._id || car.id;
  const bookingUrl = getBookingUrl ? getBookingUrl(carId) : `/booking?carId=${carId}`;
  const wishlisted = isWishlisted(carId);

  const photos =
    car?.photos && car.photos.length > 0
      ? car.photos
      : [SAMPLE_CAR_PHOTOS[index % SAMPLE_CAR_PHOTOS.length]];

  const currentPhoto = getCarPhotoUrl(photos[photoIndex % photos.length], index);

  const brand = car.brand || car.make || "Vehicle";
  const model = car.modelName || car.model || "Model";
  const city = car.location?.city || car.location?.address || "Phnom Penh";
  const transmission = car.transmission || "Automatic";
  const seats = car.seats || 5;
  const price = car.pricePerDay || 35;

  const rating = car.averageRating || car.rating || null;
  const reviewCount = car.reviewCount || car.totalReviews || null;

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

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(car);
  };

  return (
    <div className="flex flex-col group bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Photo Container */}
      <div className="relative w-full aspect-[16/10] bg-slate-100 overflow-hidden">
        <Link href={bookingUrl} className="block w-full h-full">
          <img
            src={currentPhoto}
            alt={`${brand} ${model}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            onError={(e) => {
              e.target.src = SAMPLE_CAR_PHOTOS[index % SAMPLE_CAR_PHOTOS.length];
            }}
          />
        </Link>

        {/* Tier Badge (only for Luxury or Budget) */}
        {price >= 65 ? (
          <span className="absolute top-2.5 left-2.5 z-10 bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
            Luxury
          </span>
        ) : price <= 30 ? (
          <span className="absolute top-2.5 left-2.5 z-10 bg-white/95 backdrop-blur-xs text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-2xs">
            Great value
          </span>
        ) : null}

        {/* Wishlist Toggle */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? "Remove from saved" : "Save car"}
          className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-xs transition-transform hover:scale-105 cursor-pointer"
        >
          <Heart
            className={`w-3.5 h-3.5 ${
              wishlisted ? "fill-rose-500 text-rose-500" : "text-slate-700"
            }`}
          />
        </button>

        {/* Carousel Prev/Next */}
        {photos.length > 1 && (
          <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <button
              type="button"
              onClick={handlePrevPhoto}
              className="w-6 h-6 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-sm pointer-events-auto cursor-pointer"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextPhoto}
              className="w-6 h-6 rounded-full bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-sm pointer-events-auto cursor-pointer"
              aria-label="Next photo"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Photo Counter */}
        {photos.length > 1 && (
          <span className="absolute bottom-2 right-2 z-10 text-[10px] font-medium bg-slate-900/60 text-white px-1.5 py-0.5 rounded">
            {photoIndex + 1}/{photos.length}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <Link href={bookingUrl} className="no-underline text-inherit block">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors truncate">
              {brand} {model}
              <span className="text-slate-400 font-normal ml-1 text-xs">{car.year || 2024}</span>
            </h3>
            {rating !== null ? (
              <div className="flex items-center gap-0.5 text-xs font-semibold text-slate-800 shrink-0">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{Number(rating).toFixed(1)}</span>
              </div>
            ) : (
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                New
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 truncate">
            <span>{transmission}</span>
            <span>·</span>
            <span>{seats} seats</span>
            <span>·</span>
            <span className="inline-flex items-center gap-0.5 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              {city}
            </span>
          </div>
        </Link>

        {/* Price & Book Row */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-slate-900 text-base">${price}</span>
              <span className="text-slate-500 text-xs">/ day</span>
            </div>
            {rating !== null && reviewCount !== null && (
              <div className="text-[11px] text-slate-400">
                {reviewCount} {reviewCount === 1 ? "trip" : "trips"}
              </div>
            )}
          </div>

          <Link
            href={bookingUrl}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold transition-colors no-underline"
          >
            Book
          </Link>
        </div>
      </div>
    </div>
  );
}

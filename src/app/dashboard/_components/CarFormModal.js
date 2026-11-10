"use client";
import { useState } from "react";
import { X, UploadCloud, Trash2 } from "lucide-react";
import { createCar, updateCar, deleteCarPhoto, getCarPhotoUrl } from "@/lib/api";

const CATEGORIES = ["Sedan", "SUV", "Hatchback", "Truck", "Van", "Luxury", "Electric", "Convertible", "Other"];
const TRANSMISSIONS = ["Automatic", "Manual"];
const FUEL_TYPES = ["Gasoline", "Diesel", "Electric", "Hybrid"];
const CAR_STATUSES = ["AVAILABLE", "UNAVAILABLE", "MAINTENANCE"];
const CITIES = ["Phnom Penh", "Siem Reap", "Sihanoukville", "Battambang", "Kampot"];

export default function CarFormModal({ isOpen, onClose, car, token, onSaved, showToast }) {
  if (!isOpen) return null;
  return (
    <CarFormModalInner
      key={car?._id || "new-car"}
      onClose={onClose}
      car={car}
      token={token}
      onSaved={onSaved}
      showToast={showToast}
    />
  );
}

function CarFormModalInner({ onClose, car, token, onSaved, showToast }) {
  const isEditing = Boolean(car?._id);

  const [brand, setBrand] = useState(() => car?.brand || car?.make || "");
  const [modelName, setModelName] = useState(() => car?.modelName || car?.model || "");
  const [year, setYear] = useState(() => String(car?.year || new Date().getFullYear()));
  const [licensePlate, setLicensePlate] = useState(() => car?.licensePlate || "");
  const [category, setCategory] = useState(() => car?.category || "Sedan");
  const [seats, setSeats] = useState(() => String(car?.seats || 5));
  const [transmission, setTransmission] = useState(() => car?.transmission || "Automatic");
  const [fuelType, setFuelType] = useState(() => car?.fuelType || "Gasoline");
  const [pricePerDay, setPricePerDay] = useState(() => String(car?.pricePerDay ?? 35));
  const [status, setStatus] = useState(
    () => car?.status || (car?.isAvailable === false ? "UNAVAILABLE" : "AVAILABLE")
  );
  const [city, setCity] = useState(() => car?.location?.city || "Phnom Penh");
  const [address, setAddress] = useState(() => car?.location?.address || "");
  const [featuresText, setFeaturesText] = useState(() =>
    car
      ? Array.isArray(car.features)
        ? car.features.join(", ")
        : ""
      : "Bluetooth, Air Conditioning, Backup Camera"
  );
  const [description, setDescription] = useState(() => car?.description || "");
  const [existingPhotos, setExistingPhotos] = useState(() =>
    Array.isArray(car?.photos) ? car.photos : []
  );
  const [newFiles, setNewFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deletingPhotoIdx, setDeletingPhotoIdx] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    const remainingSlots = Math.max(0, 5 - existingPhotos.length);
    if (selected.length > remainingSlots) {
      showToast?.(`Max 5 photos per vehicle (${remainingSlots} slots left)`, "info");
    }
    setNewFiles(selected.slice(0, remainingSlots));
  };

  const handleRemoveExistingPhoto = async (idx) => {
    if (!car?._id || !token) return;
    setDeletingPhotoIdx(idx);
    try {
      const res = await deleteCarPhoto(car._id, String(idx), token);
      if (res?.success) {
        setExistingPhotos(res.photos || existingPhotos.filter((_, i) => i !== idx));
        showToast?.("Photo removed", "success");
      } else {
        setError(res?.message || "Could not delete photo");
      }
    } catch (err) {
      setError(err?.message || "Failed to delete photo");
    } finally {
      setDeletingPhotoIdx(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError("Please sign in first");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("brand", brand.trim());
      formData.append("modelName", modelName.trim());
      formData.append("year", String(Number(year) || new Date().getFullYear()));
      formData.append("licensePlate", licensePlate.trim().toUpperCase());
      formData.append("category", category);
      formData.append("seats", String(Number(seats) || 5));
      formData.append("transmission", transmission);
      formData.append("fuelType", fuelType);
      formData.append("pricePerDay", String(Number(pricePerDay) || 0));
      formData.append("status", status);
      formData.append("isAvailable", String(status === "AVAILABLE"));
      formData.append("location", JSON.stringify({ city: city.trim(), address: address.trim() }));
      const featuresArr = featuresText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      formData.append("features", JSON.stringify(featuresArr));
      formData.append("description", description.trim());

      newFiles.forEach((file) => {
        formData.append("photos", file);
      });

      const res = isEditing
        ? await updateCar(car._id, formData, token)
        : await createCar(formData, token);

      if (res?.success) {
        showToast?.(isEditing ? "Vehicle updated" : "Vehicle listed", "success");
        onSaved?.();
        onClose();
      } else {
        setError(res?.message || "Failed to save vehicle");
      }
    } catch (err) {
      setError(err?.message || "Network error while saving vehicle");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-8"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            {isEditing ? "Edit vehicle" : "Add vehicle"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Brand <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Toyota"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Camry"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Year <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1990"
                max="2030"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                License plate <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="2AA-1234"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none font-mono uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Price / day (USD) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transmission</label>
              <select
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none bg-white"
              >
                {TRANSMISSIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fuel type</label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none bg-white"
              >
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Seats</label>
              <input
                type="number"
                min="1"
                max="20"
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none bg-white"
              >
                {CAR_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none bg-white"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street 271, Toul Kork"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Features (comma-separated)
            </label>
            <input
              type="text"
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder="Bluetooth, AC, Cruise Control"
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Condition, pick-up notes..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-600 outline-none resize-none"
            />
          </div>

          {/* Existing Photos when editing */}
          {isEditing && existingPhotos.length > 0 && (
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                Current photos ({existingPhotos.length}/5)
              </span>
              <div className="flex flex-wrap gap-2">
                {existingPhotos.map((photo, idx) => (
                  <div key={`${photo}-${idx}`} className="relative w-20 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src={getCarPhotoUrl(photo, idx)}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingPhoto(idx)}
                      disabled={deletingPhotoIdx === idx}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/75 hover:bg-rose-600 text-white flex items-center justify-center cursor-pointer disabled:opacity-50"
                      aria-label="Delete photo"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload New Photos */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isEditing ? "Add photos" : "Photos"} (max 5)
            </label>
            <label className="flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3 text-xs text-slate-600 bg-slate-50/50 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <UploadCloud className="w-4 h-4 text-slate-400" />
              <span>
                {newFiles.length > 0
                  ? `${newFiles.length} file${newFiles.length === 1 ? "" : "s"} selected`
                  : "Upload images (JPG, PNG, WebP)"}
              </span>
            </label>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving…" : isEditing ? "Save changes" : "Create vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

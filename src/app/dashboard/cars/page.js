"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  RefreshCw,
  Download,
  Search,
  Car,
  CheckCircle2,
  Wrench,
  DollarSign,
} from "lucide-react";
import {
  getMyCars,
  getCars,
  updateCarStatus,
  deleteCar,
  getCarPhotoUrl,
} from "@/lib/api";
import { useBasket } from "@/context/BasketContext";
import { useDashboard } from "../_components/DashboardShell";
import { formatCurrency, downloadCsv } from "../_components/StatusBadge";
import PaginationBar from "../_components/PaginationBar";
import CarFormModal from "../_components/CarFormModal";
import StatCard from "../_components/StatCard";

const STATUS_TABS = ["ALL", "AVAILABLE", "UNAVAILABLE", "MAINTENANCE"];

export default function DashboardCarsPage() {
  const { user, token, profileLoaded } = useDashboard();
  const { showToast } = useBasket();

  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const [scope, setScope] = useState("auto"); // "auto" | "my" | "all"
  const effectiveScope = scope === "auto" ? (isAdmin ? "all" : "my") : scope;
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [cars, setCars] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [confirmDeleteCar, setConfirmDeleteCar] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchCarsList = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (statusFilter !== "ALL") params.status = statusFilter;

      const res =
        effectiveScope === "all" && isAdmin
          ? await getCars(params)
          : await getMyCars(params, token);

      if (res?.success) {
        setCars(res.cars || res.data || []);
        setMeta(res.meta || null);
      } else {
        setError(res?.message || "Could not load vehicles");
      }
    } catch (err) {
      setError(err?.message || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }, [token, effectiveScope, isAdmin, statusFilter, page, limit]);

  useEffect(() => {
    if (!profileLoaded) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) void fetchCarsList();
    });
    return () => {
      active = false;
    };
  }, [profileLoaded, fetchCarsList]);

  const filteredCars = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cars;
    return cars.filter((c) => {
      const text = `${c.brand || ""} ${c.modelName || ""} ${c.licensePlate || ""} ${c.location?.city || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [cars, searchQuery]);

  const summary = useMemo(() => {
    const total = meta?.total ?? cars.length;
    const available = cars.filter((c) => (c.status || "AVAILABLE") === "AVAILABLE").length;
    const maintenance = cars.filter((c) => c.status === "MAINTENANCE").length;
    const avgRate =
      cars.length > 0
        ? cars.reduce((sum, c) => sum + (Number(c.pricePerDay) || 0), 0) / cars.length
        : 0;
    return { total, available, maintenance, avgRate };
  }, [meta?.total, cars]);

  const handleStatusChange = async (carId, nextStatus) => {
    if (!token) return;
    setBusyId(carId);
    try {
      const res = await updateCarStatus(
        carId,
        { status: nextStatus, isAvailable: nextStatus === "AVAILABLE" },
        token
      );
      if (res?.success) {
        setCars((prev) =>
          prev.map((c) =>
            c._id === carId
              ? { ...c, status: nextStatus, isAvailable: nextStatus === "AVAILABLE" }
              : c
          )
        );
        showToast?.(`Status set to ${nextStatus.toLowerCase()}`, "success");
      } else {
        showToast?.(res?.message || "Failed to update status", "error");
      }
    } catch (err) {
      showToast?.(err?.message || "Failed to update status", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteCar?._id || !token) return;
    setBusyId(confirmDeleteCar._id);
    try {
      const res = await deleteCar(confirmDeleteCar._id, token);
      if (res?.success) {
        showToast?.("Vehicle deleted", "success");
        setConfirmDeleteCar(null);
        fetchCarsList();
      } else {
        showToast?.(res?.message || "Could not delete vehicle", "error");
      }
    } catch (err) {
      showToast?.(err?.message || "Failed to delete vehicle", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = () => {
    downloadCsv(
      "fleet.csv",
      ["Brand", "Model", "Year", "License Plate", "Category", "City", "Rate USD", "Status"],
      filteredCars.map((c) => [
        c.brand || c.make || "",
        c.modelName || c.model || "",
        c.year || "",
        c.licensePlate || "",
        c.category || "",
        c.location?.city || "",
        Number(c.pricePerDay || 0).toFixed(2),
        c.status || "AVAILABLE",
      ])
    );
  };

  if (profileLoaded && !token) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto my-8">
        <p className="text-sm font-semibold text-slate-900 mb-3">Sign in required</p>
        <Link
          href="/auth/login?redirect=/dashboard/cars"
          className="inline-flex px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold no-underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      {/* Header */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Fleet</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage vehicles, pricing, and availability</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredCars.length === 0}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCar(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add vehicle</span>
          </button>

          <button
            type="button"
            onClick={fetchCarsList}
            disabled={loading}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer disabled:opacity-50"
            aria-label="Refresh fleet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4-Card Summary Strip */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Vehicles"
          value={summary.total}
          subtitle={effectiveScope === "all" && isAdmin ? "Across all hosts" : "In your fleet"}
          icon={Car}
        />
        <StatCard
          title="Available (Page)"
          value={summary.available}
          subtitle={`Out of ${cars.length} shown`}
          icon={CheckCircle2}
        />
        <StatCard
          title="Maintenance (Page)"
          value={summary.maintenance}
          subtitle="Temporarily offline"
          icon={Wrench}
        />
        <StatCard
          title="Avg. Daily Rate"
          value={formatCurrency(summary.avgRate)}
          subtitle="Current view average"
          icon={DollarSign}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter brand, plate, city..."
              className="w-full h-8 text-xs pl-8 pr-3 rounded-lg border border-slate-200 bg-white focus:border-slate-400 outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="h-8 text-xs font-medium px-2.5 rounded-lg border border-dashed border-slate-300 bg-white text-slate-700 cursor-pointer"
          >
            {STATUS_TABS.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "+ Status: All" : `Status: ${s.charAt(0) + s.slice(1).toLowerCase()}`}
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <div className="inline-flex bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setScope("all");
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                effectiveScope === "all" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              All fleet
            </button>
            <button
              type="button"
              onClick={() => {
                setScope("my");
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                effectiveScope === "my" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              My fleet
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="shrink-0 flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Fleet Table */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-lg skeleton-shimmer" />
            ))}
          </div>
        ) : filteredCars.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 flex-1 flex items-center justify-center">
            No vehicles found.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[760px]">
              <thead className="sticky top-0 z-10 bg-slate-50/95 border-b border-slate-200 text-[11px] font-medium text-slate-500">
                <tr>
                  <th className="py-2.5 px-4">Vehicle</th>
                  <th className="py-2.5 px-4">Plate</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4">Rate</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCars.map((car, idx) => (
                  <tr key={car._id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-8 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                          <img
                            src={getCarPhotoUrl(car.photos?.[0], idx)}
                            alt={`${car.brand} ${car.modelName}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate">
                            {car.brand || car.make} {car.modelName || car.model} ({car.year || 2024})
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {car.category || "Sedan"} · {car.transmission || "Automatic"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">{car.licensePlate}</td>
                    <td className="py-2.5 px-4 text-slate-600">{car.location?.city || "—"}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(car.pricePerDay)}/d
                    </td>
                    <td className="py-2.5 px-4">
                      <select
                        value={car.status || (car.isAvailable === false ? "UNAVAILABLE" : "AVAILABLE")}
                        disabled={busyId === car._id}
                        onChange={(e) => handleStatusChange(car._id, e.target.value)}
                        aria-label="Vehicle status"
                        className="h-7 text-xs font-medium px-2 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-50"
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="UNAVAILABLE">Unavailable</option>
                        <option value="MAINTENANCE">Maintenance</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCar(car);
                            setModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                          aria-label="Edit vehicle"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCar(car)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 cursor-pointer"
                          aria-label="Delete vehicle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && cars.length > 0 && (
          <PaginationBar
            meta={meta}
            limit={limit}
            onPageChange={(p) => setPage(p)}
            onLimitChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      <CarFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        car={editingCar}
        token={token}
        onSaved={fetchCarsList}
        showToast={showToast}
      />

      {/* Confirm Delete Modal */}
      {confirmDeleteCar && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Delete vehicle?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Remove {confirmDeleteCar.brand} {confirmDeleteCar.modelName} ({confirmDeleteCar.licensePlate}) from listings.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteCar(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busyId === confirmDeleteCar._id}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {busyId === confirmDeleteCar._id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

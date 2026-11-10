"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  Download,
  Search,
  CalendarCheck,
  Clock,
  Activity,
} from "lucide-react";
import {
  getHostBookings,
  getAllBookings,
  confirmBookingPickup,
  completeBooking,
  cancelBooking,
} from "@/lib/api";
import { useBasket } from "@/context/BasketContext";
import { useDashboard } from "../_components/DashboardShell";
import StatusBadge, {
  formatCurrency,
  formatShortDate,
  downloadCsv,
} from "../_components/StatusBadge";
import PaginationBar from "../_components/PaginationBar";
import StatCard from "../_components/StatCard";

const BOOKING_STATUSES = [
  "ALL",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];

export default function DashboardBookingsPage() {
  const { user, token, profileLoaded } = useDashboard();
  const { showToast } = useBasket();

  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const [scope, setScope] = useState("auto"); // "auto" | "all" | "host"
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [bookings, setBookings] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Return completion modal state
  const [completingBooking, setCompletingBooking] = useState(null);
  const [mileage, setMileage] = useState("");
  const [fuelLevel, setFuelLevel] = useState("Full");
  const [damageReported, setDamageReported] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");

  // Cancel reason modal state
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  const effectiveScope = scope === "auto" ? (isAdmin ? "all" : "host") : scope;

  const fetchBookings = useCallback(async () => {
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
        effectiveScope === "all"
          ? await getAllBookings(token, params)
          : await getHostBookings(token, params);

      if (res?.success) {
        setBookings(res.bookings || []);
        setMeta(res.meta || null);
      } else {
        setError(res?.message || "Could not load bookings");
      }
    } catch (err) {
      setError(err?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [token, effectiveScope, statusFilter, page, limit]);

  useEffect(() => {
    if (!profileLoaded) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) void fetchBookings();
    });
    return () => {
      active = false;
    };
  }, [profileLoaded, fetchBookings]);

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) => {
      const text = `${b.car?.brand || ""} ${b.car?.modelName || ""} ${b.car?.licensePlate || ""} ${b.customer?.name || ""} ${b.customer?.email || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [bookings, searchQuery]);

  const summary = useMemo(() => {
    const total = meta?.total ?? bookings.length;
    const active = bookings.filter((b) => b.status === "ACTIVE").length;
    const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
    const pending = bookings.filter((b) => b.status === "PENDING_PAYMENT").length;
    return { total, active, confirmed, pending };
  }, [meta?.total, bookings]);

  const handleConfirmPickup = async (bookingId) => {
    if (!token) return;
    setBusyId(bookingId);
    try {
      const res = await confirmBookingPickup(bookingId, token);
      if (res?.success) {
        showToast?.("Pick-up confirmed — rental active", "success");
        fetchBookings();
      } else {
        showToast?.(res?.message || "Failed to confirm pick-up", "error");
      }
    } catch (err) {
      showToast?.(err?.message || "Failed to confirm pick-up", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!completingBooking?._id || !token) return;
    setBusyId(completingBooking._id);
    try {
      const payload = {
        fuelLevel,
        damageReported,
        returnNotes: returnNotes.trim(),
      };
      if (mileage !== "") payload.mileage = Number(mileage);

      const res = await completeBooking(completingBooking._id, payload, token);
      if (res?.success) {
        showToast?.("Return completed", "success");
        setCompletingBooking(null);
        fetchBookings();
      } else {
        showToast?.(res?.message || "Failed to complete return", "error");
      }
    } catch (err) {
      showToast?.(err?.message || "Failed to complete return", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancellingBooking?._id || !token) return;
    setBusyId(cancellingBooking._id);
    try {
      const res = await cancelBooking(
        cancellingBooking._id,
        cancelReason.trim() || "Cancelled from dashboard",
        token
      );
      if (res?.success) {
        showToast?.("Booking cancelled", "info");
        setCancellingBooking(null);
        setCancelReason("");
        fetchBookings();
      } else {
        showToast?.(res?.message || "Failed to cancel booking", "error");
      }
    } catch (err) {
      showToast?.(err?.message || "Failed to cancel booking", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = () => {
    downloadCsv(
      "bookings.csv",
      ["Vehicle", "Plate", "Customer", "Email", "Start Date", "End Date", "Total USD", "Payment", "Status"],
      filteredBookings.map((b) => [
        `${b.car?.brand || ""} ${b.car?.modelName || ""}`.trim(),
        b.car?.licensePlate || "",
        b.customer?.name || "",
        b.customer?.email || "",
        formatShortDate(b.startDate),
        formatShortDate(b.endDate),
        Number(b.totalPrice || 0).toFixed(2),
        b.paymentStatus || "PENDING",
        b.status || "",
      ])
    );
  };

  if (profileLoaded && !token) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto my-8">
        <p className="text-sm font-semibold text-slate-900 mb-3">Sign in required</p>
        <Link
          href="/auth/login?redirect=/dashboard/bookings"
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Bookings</h2>
          <p className="text-xs text-slate-500 mt-0.5">Verify pick-ups, returns, and cancellations</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredBookings.length === 0}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={fetchBookings}
            disabled={loading}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer disabled:opacity-50"
            aria-label="Refresh bookings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4-Card Summary Strip */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Bookings"
          value={summary.total}
          subtitle={effectiveScope === "all" ? "Platform-wide" : "Your vehicles"}
          icon={CalendarCheck}
        />
        <StatCard
          title="Active (Page)"
          value={summary.active}
          subtitle="Currently out on rental"
          icon={Activity}
        />
        <StatCard
          title="Confirmed (Page)"
          value={summary.confirmed}
          subtitle="Ready for pick-up"
          icon={CheckCircle2}
        />
        <StatCard
          title="Pending (Page)"
          value={summary.pending}
          subtitle="Awaiting payment"
          icon={Clock}
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
              placeholder="Filter vehicle or customer..."
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
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "ALL"
                  ? "+ Status: All"
                  : s === "PENDING_PAYMENT"
                  ? "Status: Pending"
                  : `Status: ${s.charAt(0) + s.slice(1).toLowerCase()}`}
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
              All bookings
            </button>
            <button
              type="button"
              onClick={() => {
                setScope("host");
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                effectiveScope === "host" ? "bg-slate-900 text-white" : "text-slate-600"
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

      {/* Bookings Table */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-lg skeleton-shimmer" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 flex-1 flex items-center justify-center">
            No bookings found.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[840px]">
              <thead className="sticky top-0 z-10 bg-slate-50/95 border-b border-slate-200 text-[11px] font-medium text-slate-500">
                <tr>
                  <th className="py-2.5 px-4">Vehicle</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Dates</th>
                  <th className="py-2.5 px-4">Total</th>
                  <th className="py-2.5 px-4">Payment</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => {
                  const canConfirm = ["CONFIRMED", "PAID", "PENDING_PAYMENT"].includes(b.status);
                  const canComplete = b.status === "ACTIVE";
                  const canCancel = !["COMPLETED", "CANCELLED"].includes(b.status);

                  return (
                    <tr key={b._id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900">
                          {b.car?.brand || b.car?.make || "Vehicle"} {b.car?.modelName || b.car?.model || ""}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {b.car?.licensePlate || b._id?.slice(-6).toUpperCase()}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-800">{b.customer?.name || "—"}</div>
                        <div className="text-[11px] text-slate-500">
                          {b.customer?.phoneNumber || b.customer?.email || ""}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatShortDate(b.startDate)} – {formatShortDate(b.endDate)}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(b.totalPrice)}
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={b.paymentStatus || "PENDING"} />
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {canConfirm && (
                            <button
                              type="button"
                              disabled={busyId === b._id}
                              onClick={() => handleConfirmPickup(b._id)}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Pick-up</span>
                            </button>
                          )}

                          {canComplete && (
                            <button
                              type="button"
                              disabled={busyId === b._id}
                              onClick={() => {
                                setCompletingBooking(b);
                                setMileage("");
                                setFuelLevel("Full");
                                setDamageReported(false);
                                setReturnNotes("");
                              }}
                              className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer disabled:opacity-50"
                            >
                              Complete
                            </button>
                          )}

                          {canCancel && (
                            <button
                              type="button"
                              disabled={busyId === b._id}
                              onClick={() => {
                                setCancellingBooking(b);
                                setCancelReason("");
                              }}
                              className="h-7 px-2.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-rose-600 font-medium cursor-pointer disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && bookings.length > 0 && (
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

      {/* Complete Return Modal */}
      {completingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCompleteSubmit}
            className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Complete vehicle return</h3>
              <button
                type="button"
                onClick={() => setCompletingBooking(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Return mileage (km)
                </label>
                <input
                  type="number"
                  min="0"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="45200"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fuel level
                </label>
                <select
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-slate-400 outline-none"
                >
                  <option value="Full">Full</option>
                  <option value="3/4">3/4</option>
                  <option value="1/2">1/2</option>
                  <option value="1/4">1/4</option>
                  <option value="Empty">Empty</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={damageReported}
                onChange={(e) => setDamageReported(e.target.checked)}
                className="w-4 h-4 accent-rose-600"
              />
              <span>Damage reported on return</span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
              <textarea
                rows={2}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Clean condition, keys returned..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-400 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompletingBooking(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId === completingBooking._id}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {busyId === completingBooking._id ? "Saving…" : "Complete return"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCancelSubmit}
            className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Cancel booking?</h3>
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Customer request or maintenance"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-400 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 cursor-pointer"
              >
                Keep
              </button>
              <button
                type="submit"
                disabled={busyId === cancellingBooking._id}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {busyId === cancellingBooking._id ? "Cancelling…" : "Confirm cancel"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

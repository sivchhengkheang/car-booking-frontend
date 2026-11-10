"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  RefreshCw,
  RotateCcw,
  X,
  Download,
  Search,
  CreditCard,
  CheckCircle2,
  Clock,
  DollarSign,
} from "lucide-react";
import { getAllPayments, refundPayment } from "@/lib/api";
import { useBasket } from "@/context/BasketContext";
import { useDashboard } from "../_components/DashboardShell";
import StatusBadge, {
  formatCurrency,
  formatShortDate,
  downloadCsv,
} from "../_components/StatusBadge";
import PaginationBar from "../_components/PaginationBar";
import StatCard from "../_components/StatCard";

const PAYMENT_STATUSES = ["ALL", "PENDING", "COMPLETED", "REFUNDED", "FAILED"];

export default function DashboardPaymentsPage() {
  const { token, profileLoaded } = useDashboard();
  const { showToast } = useBasket();

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [refundTarget, setRefundTarget] = useState(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  const fetchPayments = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const res = await getAllPayments(token, params);
      if (res?.success) {
        setPayments(res.payments || []);
        setMeta(res.meta || null);
      } else {
        setError(res?.message || "Admin access required to view all payments.");
      }
    } catch (err) {
      setError(err?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, statusFilter, fromDate, toDate]);

  useEffect(() => {
    if (!profileLoaded) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) void fetchPayments();
    });
    return () => {
      active = false;
    };
  }, [profileLoaded, fetchPayments]);

  const filteredPayments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => {
      const text = `${p.barayOrderId || ""} ${p.user?.name || ""} ${p.user?.email || ""} ${p.booking?.car?.brand || ""} ${p.booking?.car?.modelName || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [payments, searchQuery]);

  const summary = useMemo(() => {
    const total = meta?.total ?? payments.length;
    const completed = payments.filter((p) => ["COMPLETED", "PAID", "SUCCESS"].includes(p.status)).length;
    const pending = payments.filter((p) => p.status === "PENDING").length;
    const pageAmount = payments
      .filter((p) => ["COMPLETED", "PAID", "SUCCESS"].includes(p.status))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    return { total, completed, pending, pageAmount };
  }, [meta?.total, payments]);

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (!refundTarget?._id || !token) return;
    setRefunding(true);
    try {
      const payload = { reason: refundReason.trim() || "Admin refund" };
      if (refundAmount !== "") payload.amount = Number(refundAmount);

      const res = await refundPayment(refundTarget._id, payload, token);
      if (res?.success) {
        showToast?.("Payment refunded", "success");
        setRefundTarget(null);
        fetchPayments();
      } else {
        showToast?.(res?.message || "Refund failed", "error");
      }
    } catch (err) {
      showToast?.(err?.message || "Refund failed", "error");
    } finally {
      setRefunding(false);
    }
  };

  const handleExport = () => {
    downloadCsv(
      "payments.csv",
      ["Order ID", "Method", "Customer", "Email", "Vehicle", "Date", "Amount USD", "Status"],
      filteredPayments.map((p) => [
        p.barayOrderId || p._id,
        p.paymentMethod || "",
        p.user?.name || "",
        p.user?.email || "",
        p.booking?.car ? `${p.booking.car.brand || ""} ${p.booking.car.modelName || ""}`.trim() : "",
        formatShortDate(p.createdAt),
        Number(p.amount || 0).toFixed(2),
        p.status || "",
      ])
    );
  };

  if (profileLoaded && !token) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto my-8">
        <p className="text-sm font-semibold text-slate-900 mb-3">Sign in required</p>
        <Link
          href="/auth/login?redirect=/dashboard/payments"
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Payments</h2>
          <p className="text-xs text-slate-500 mt-0.5">Transaction history, Baray orders, and refunds</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredPayments.length === 0}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={fetchPayments}
            disabled={loading}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer disabled:opacity-50"
            aria-label="Refresh payments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4-Card Summary Strip */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Transactions"
          value={summary.total}
          subtitle="All payment attempts"
          icon={CreditCard}
        />
        <StatCard
          title="Completed Volume (Page)"
          value={formatCurrency(summary.pageAmount)}
          subtitle="Settled in current view"
          icon={DollarSign}
        />
        <StatCard
          title="Completed (Page)"
          value={summary.completed}
          subtitle={`Out of ${payments.length} shown`}
          icon={CheckCircle2}
        />
        <StatCard
          title="Pending (Page)"
          value={summary.pending}
          subtitle="In progress / unconfirmed"
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
              placeholder="Filter order ID, email, car..."
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
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "+ Status: All" : `Status: ${s.charAt(0) + s.slice(1).toLowerCase()}`}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 h-8">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              aria-label="From date"
              className="text-xs text-slate-700 bg-transparent outline-none"
            />
            <span className="text-xs text-slate-300">–</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              aria-label="To date"
              className="text-xs text-slate-700 bg-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="shrink-0 flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Payments Table */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-lg skeleton-shimmer" />
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 flex-1 flex items-center justify-center">
            No payments found.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[780px]">
              <thead className="sticky top-0 z-10 bg-slate-50/95 border-b border-slate-200 text-[11px] font-medium text-slate-500">
                <tr>
                  <th className="py-2.5 px-4">Order / Method</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Vehicle</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700">
                      <div className="truncate max-w-[180px]">{p.barayOrderId || p._id}</div>
                      {p.paymentMethod && (
                        <div className="text-slate-400">{p.paymentMethod}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">{p.user?.name || "—"}</div>
                      <div className="text-[11px] text-slate-500">{p.user?.email || ""}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {p.booking?.car
                        ? `${p.booking.car.brand || ""} ${p.booking.car.modelName || ""}`
                        : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatShortDate(p.createdAt)}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {p.status !== "REFUNDED" && (
                        <button
                          type="button"
                          onClick={() => {
                            setRefundTarget(p);
                            setRefundAmount(String(p.amount ?? ""));
                            setRefundReason("");
                          }}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-slate-200 hover:bg-violet-50 hover:border-violet-200 text-violet-700 font-medium cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Refund</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && payments.length > 0 && (
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

      {/* Refund Modal */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRefundSubmit}
            className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Process refund</h3>
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Customer cancellation"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-slate-400 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={refunding}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {refunding ? "Processing…" : "Confirm refund"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

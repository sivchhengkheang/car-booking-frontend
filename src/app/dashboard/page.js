"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Download,
  DollarSign,
  CalendarCheck,
  Car,
  Users as UsersIcon,
  Search,
} from "lucide-react";
import {
  getAdminStats,
  getMyCars,
  getHostBookings,
  getAllBookings,
  getAllUsers,
} from "@/lib/api";
import { useDashboard } from "./_components/DashboardShell";
import StatusBadge, {
  formatCurrency,
  formatShortDate,
  downloadCsv,
} from "./_components/StatusBadge";
import PaginationBar from "./_components/PaginationBar";
import StatCard from "./_components/StatCard";
import { AreaActivityChart, BarBreakdownChart } from "./_components/MiniCharts";

export default function DashboardOverviewPage() {
  const { user, token, profileLoaded } = useDashboard();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [hostSummary, setHostSummary] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentMeta, setRecentMeta] = useState(null);
  const [recentPage, setRecentPage] = useState(1);
  const [recentLimit, setRecentLimit] = useState(10);
  const [tableFilter, setTableFilter] = useState("");
  const [sideMembers, setSideMembers] = useState([]);
  const [sideCars, setSideCars] = useState([]);
  const [isAdminView, setIsAdminView] = useState(false);

  const fetchOverview = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dateParams = {};
      if (fromDate) dateParams.from = fromDate;
      if (toDate) dateParams.to = toDate;

      const bookingParams = { page: recentPage, limit: recentLimit };
      const isAdmin = user?.role?.toUpperCase() === "ADMIN";

      if (isAdmin) {
        const [statsRes, bookingsRes, usersRes] = await Promise.all([
          getAdminStats(dateParams, token),
          getAllBookings(token, bookingParams),
          getAllUsers(token, { limit: 5 }),
        ]);

        if (statsRes?.success) {
          setIsAdminView(true);
          setAdminStats(statsRes.stats);
          setHostSummary(null);
          setRecentBookings(bookingsRes?.bookings || []);
          setRecentMeta(bookingsRes?.meta || null);
          setSideMembers(usersRes?.users || []);
          setSideCars([]);
          setLoading(false);
          return;
        }
      }

      // Host view (or fallback if /admin/stats is forbidden)
      const [carsRes, hostBookingsRes] = await Promise.all([
        getMyCars({ limit: 50 }, token),
        getHostBookings(token, bookingParams),
      ]);

      if (carsRes?.success || hostBookingsRes?.success) {
        const carsList = carsRes?.cars || [];
        const bookingsList = hostBookingsRes?.bookings || [];
        const activeCars = carsList.filter((c) => c.status === "AVAILABLE").length;
        const activeRentals = bookingsList.filter((b) => b.status === "ACTIVE").length;
        const totalRevenue = bookingsList
          .filter((b) => ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(b.status))
          .reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);

        setIsAdminView(false);
        setHostSummary({
          totalCars: carsRes?.meta?.total ?? carsList.length,
          activeCars,
          totalBookings: hostBookingsRes?.meta?.total ?? bookingsList.length,
          activeRentals,
          revenue: totalRevenue,
        });
        setAdminStats(null);
        setRecentBookings(bookingsList);
        setRecentMeta(hostBookingsRes?.meta || null);
        setSideCars(carsList.slice(0, 5));
        setSideMembers([]);
      } else {
        const statsRes = await getAdminStats(dateParams, token);
        if (statsRes?.success) {
          const [bookingsRes, usersRes] = await Promise.all([
            getAllBookings(token, bookingParams),
            getAllUsers(token, { limit: 5 }),
          ]);
          setIsAdminView(true);
          setAdminStats(statsRes.stats);
          setRecentBookings(bookingsRes?.bookings || []);
          setRecentMeta(bookingsRes?.meta || null);
          setSideMembers(usersRes?.users || []);
        } else {
          setError(
            carsRes?.message ||
              hostBookingsRes?.message ||
              statsRes?.message ||
              "Host or Admin access required for dashboard analytics."
          );
        }
      }
    } catch (err) {
      setError(err?.message || "Failed to load dashboard overview");
    } finally {
      setLoading(false);
    }
  }, [token, user, fromDate, toDate, recentPage, recentLimit]);

  useEffect(() => {
    if (!profileLoaded) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) void fetchOverview();
    });
    return () => {
      active = false;
    };
  }, [profileLoaded, fetchOverview]);

  const filteredRecentBookings = useMemo(() => {
    const q = tableFilter.trim().toLowerCase();
    if (!q) return recentBookings;
    return recentBookings.filter((b) => {
      const carLabel = `${b.car?.brand || ""} ${b.car?.modelName || ""}`.toLowerCase();
      const custLabel = `${b.customer?.name || ""} ${b.customer?.email || ""}`.toLowerCase();
      return carLabel.includes(q) || custLabel.includes(q);
    });
  }, [recentBookings, tableFilter]);

  // Build real trend points grouped by short date from loaded bookings
  const trendPoints = useMemo(() => {
    if (!recentBookings.length) return [];
    const grouped = new Map();
    [...recentBookings]
      .sort((a, b) => new Date(a.createdAt || a.startDate) - new Date(b.createdAt || b.startDate))
      .forEach((b) => {
        const d = new Date(b.createdAt || b.startDate);
        if (isNaN(d.getTime())) return;
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        grouped.set(label, (grouped.get(label) || 0) + (Number(b.totalPrice) || 0));
      });
    return Array.from(grouped.entries())
      .slice(-7)
      .map(([label, value]) => ({ label, value }));
  }, [recentBookings]);

  const sparkValues = useMemo(
    () =>
      recentBookings
        .slice(0, 8)
        .reverse()
        .map((b) => Number(b.totalPrice) || 0),
    [recentBookings]
  );

  const statusBreakdownBars = useMemo(() => {
    const source = adminStats?.bookings
      ? adminStats.bookings
      : recentBookings.reduce((acc, b) => {
          const k = b.status || "PENDING";
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {});

    const colorMap = {
      CONFIRMED: "bg-sky-500",
      ACTIVE: "bg-emerald-500",
      COMPLETED: "bg-slate-800",
      PENDING_PAYMENT: "bg-amber-400",
      CANCELLED: "bg-rose-400",
    };

    const labelMap = {
      PENDING_PAYMENT: "Pending",
      CONFIRMED: "Confirmed",
      ACTIVE: "Active",
      COMPLETED: "Done",
      CANCELLED: "Cancelled",
    };

    return Object.entries(source).map(([key, count]) => ({
      label: labelMap[key] || key,
      value: Number(count) || 0,
      color: colorMap[key] || "bg-slate-400",
    }));
  }, [adminStats, recentBookings]);

  const bookingStatuses = adminStats?.bookings ? Object.entries(adminStats.bookings) : [];
  const totalBookingCount = bookingStatuses.reduce((sum, [, count]) => sum + count, 0);

  const handleExport = () => {
    downloadCsv(
      "dashboard-bookings.csv",
      ["Vehicle", "Customer", "Email", "Start Date", "End Date", "Total USD", "Status"],
      filteredRecentBookings.map((b) => [
        `${b.car?.brand || ""} ${b.car?.modelName || ""}`.trim(),
        b.customer?.name || "",
        b.customer?.email || "",
        formatShortDate(b.startDate),
        formatShortDate(b.endDate),
        Number(b.totalPrice || 0).toFixed(2),
        b.status || "",
      ])
    );
  };

  if (profileLoaded && !token) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto my-8">
        <p className="text-sm font-semibold text-slate-900 mb-3">Sign in required</p>
        <Link
          href="/auth/login?redirect=/dashboard"
          className="inline-flex px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold no-underline"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-5">
      {/* Page Title & Actions */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdminView ? "Platform revenue, fleet, and booking activity" : "Your fleet and rental activity"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 h-8">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="From date"
              className="text-xs text-slate-700 bg-transparent outline-none"
            />
            <span className="text-xs text-slate-300">–</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="To date"
              className="text-xs text-slate-700 bg-transparent outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={filteredRecentBookings.length === 0}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={fetchOverview}
            disabled={loading}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer disabled:opacity-50"
            aria-label="Refresh overview"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="shrink-0 flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4-Card KPI Strip */}
      {loading ? (
        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-slate-200/80 rounded-xl p-4 h-24 skeleton-shimmer" />
          ))}
        </div>
      ) : adminStats ? (
        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={adminStats.revenue?.periodRevenue != null ? "Period Revenue" : "Total Revenue"}
            value={formatCurrency(
              adminStats.revenue?.periodRevenue != null
                ? adminStats.revenue.periodRevenue
                : adminStats.revenue?.allTime
            )}
            subtitle={
              adminStats.revenue?.periodRevenue != null
                ? `All-time: ${formatCurrency(adminStats.revenue.allTime)}`
                : "Completed payments"
            }
            icon={DollarSign}
            sparkData={sparkValues}
            sparkColor="#0284c7"
          />
          <StatCard
            title="Total Bookings"
            value={totalBookingCount}
            subtitle={`${adminStats.bookings?.ACTIVE || 0} active · ${adminStats.bookings?.CONFIRMED || 0} confirmed`}
            icon={CalendarCheck}
            sparkColor="#10b981"
          />
          <StatCard
            title="Fleet Vehicles"
            value={adminStats.cars?.total || 0}
            subtitle={`${adminStats.cars?.activeAvailable || 0} available now`}
            icon={Car}
          />
          <StatCard
            title="Total Users"
            value={adminStats.users?.total || 0}
            subtitle={`${adminStats.users?.customers || 0} customers · ${adminStats.users?.hosts || 0} hosts`}
            icon={UsersIcon}
          />
        </div>
      ) : hostSummary ? (
        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Recent Revenue"
            value={formatCurrency(hostSummary.revenue)}
            subtitle="Confirmed & active bookings"
            icon={DollarSign}
            sparkData={sparkValues}
            sparkColor="#0284c7"
          />
          <StatCard
            title="Host Bookings"
            value={hostSummary.totalBookings}
            subtitle="Across your vehicles"
            icon={CalendarCheck}
          />
          <StatCard
            title="My Vehicles"
            value={hostSummary.totalCars}
            subtitle={`${hostSummary.activeCars} available now`}
            icon={Car}
          />
          <StatCard
            title="Active Rentals"
            value={hostSummary.activeRentals}
            subtitle="Currently on trip"
            icon={UsersIcon}
          />
        </div>
      ) : null}

      {/* 2-Column Charts Row */}
      {!loading && !error && (
        <div className="shrink-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <AreaActivityChart
              title="Booking Activity"
              subtitle="Recent booking volume across dates"
              points={trendPoints}
            />
          </div>
          <div className="lg:col-span-5">
            <BarBreakdownChart
              title="Bookings Breakdown"
              headline={String(isAdminView ? totalBookingCount : hostSummary?.totalBookings || recentBookings.length)}
              subtitle="Distribution by status"
              items={statusBreakdownBars}
            />
          </div>
        </div>
      )}

      {/* Bottom 2-Column Data Row */}
      {!loading && !error && (
        <div className="flex-1 min-h-[280px] grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Recent Bookings Table */}
          <div className="lg:col-span-8 min-h-0 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
            <div className="shrink-0 px-4 py-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Recent Bookings</h3>
                <p className="text-[11px] text-slate-500">Latest reservations</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    placeholder="Filter customer or car..."
                    className="w-full h-8 text-xs pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white focus:border-slate-400 outline-none"
                  />
                </div>
                <Link
                  href="/dashboard/bookings"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg px-2.5 h-8 no-underline"
                >
                  <span>All</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {filteredRecentBookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 flex-1 flex items-center justify-center">
                No matching bookings.
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 border-b border-slate-200 text-[11px] font-medium text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4">Vehicle</th>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4">Dates</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecentBookings.map((b) => (
                      <tr key={b._id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {b.car?.brand || b.car?.make || "Vehicle"} {b.car?.modelName || b.car?.model || ""}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          <div className="truncate max-w-[180px]">
                            {b.customer?.email || b.customer?.name || "—"}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                          {formatShortDate(b.startDate)} – {formatShortDate(b.endDate)}
                        </td>
                        <td className="py-2.5 px-4">
                          <StatusBadge status={b.status} />
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(b.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {recentBookings.length > 0 && (
              <PaginationBar
                meta={recentMeta}
                limit={recentLimit}
                onPageChange={(p) => setRecentPage(p)}
                onLimitChange={(nextLimit) => {
                  setRecentLimit(nextLimit);
                  setRecentPage(1);
                }}
              />
            )}
          </div>

          {/* Right: Team / Users (Admin) or Fleet Snapshot (Host) */}
          <div className="lg:col-span-4 min-h-0 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
            <div className="shrink-0 px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {isAdminView ? "Recent Users" : "My Fleet"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isAdminView ? "Latest registered accounts" : "Active vehicle listings"}
                </p>
              </div>
              <Link
                href={isAdminView ? "/dashboard/users" : "/dashboard/cars"}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 no-underline"
              >
                Manage
              </Link>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
              {isAdminView ? (
                sideMembers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No users found.</div>
                ) : (
                  sideMembers.map((m) => (
                    <div key={m._id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center shrink-0">
                          {(m.name?.[0] || m.email?.[0] || "U").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {m.name || "Unnamed"}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{m.email}</div>
                        </div>
                      </div>
                      <StatusBadge status={m.role || "CUSTOMER"} />
                    </div>
                  ))
                )
              ) : sideCars.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No vehicles listed.</div>
              ) : (
                sideCars.map((c) => (
                  <div key={c._id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {c.brand} {c.modelName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {c.licensePlate} · {formatCurrency(c.pricePerDay)}/d
                      </div>
                    </div>
                    <StatusBadge status={c.status || "AVAILABLE"} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

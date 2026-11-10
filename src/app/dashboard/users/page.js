"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
  Download,
  Users as UsersIcon,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { getAllUsers, getUser, updateUserRole, updateUserStatus } from "@/lib/api";
import { useBasket } from "@/context/BasketContext";
import { useDashboard } from "../_components/DashboardShell";
import StatusBadge, { formatShortDate, downloadCsv } from "../_components/StatusBadge";
import PaginationBar from "../_components/PaginationBar";
import StatCard from "../_components/StatCard";

export default function DashboardUsersPage() {
  const { user: currentUser, token, profileLoaded } = useDashboard();
  const { showToast } = useBasket();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const query = { page, limit };
      if (roleFilter !== "ALL") query.role = roleFilter;
      if (statusFilter !== "ALL") query.status = statusFilter;
      if (debouncedSearch) query.search = debouncedSearch;

      const res = await getAllUsers(token, query);
      if (res?.success) {
        setUsers(res.users || []);
        setMeta(res.meta || null);
      } else {
        setError(res?.message || "Admin access required to manage users.");
      }
    } catch (err) {
      setError(err?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, roleFilter, statusFilter, debouncedSearch]);

  useEffect(() => {
    if (!profileLoaded) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) void fetchUsers();
    });
    return () => {
      active = false;
    };
  }, [profileLoaded, fetchUsers]);

  const summary = useMemo(() => {
    const total = meta?.total ?? users.length;
    const activeCount = users.filter((u) => (u.status || "ACTIVE") === "ACTIVE").length;
    const hostCount = users.filter((u) => u.role === "HOST").length;
    const adminCount = users.filter((u) => u.role === "ADMIN").length;
    return { total, activeCount, hostCount, adminCount };
  }, [meta?.total, users]);

  const handleRoleChange = async (userId, nextRole) => {
    if (!token) return;
    setBusyId(userId);
    try {
      const res = await updateUserRole(userId, nextRole, token);
      if (res?.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, role: nextRole } : u))
        );
        showToast?.(`Role updated to ${nextRole}`, "success");
      } else {
        showToast?.(res?.message || "Failed to update role", "error");
      }
    } catch (err) {
      showToast?.(err?.message || "Failed to update role", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleStatus = async (u) => {
    if (!token) return;
    const nextStatus = u.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    setBusyId(u._id);
    try {
      const res = await updateUserStatus(u._id, nextStatus, token);
      if (res?.success) {
        setUsers((prev) =>
          prev.map((item) =>
            item._id === u._id ? { ...item, status: nextStatus } : item
          )
        );
        showToast?.(
          nextStatus === "SUSPENDED" ? "Account suspended" : "Account activated",
          "info"
        );
      } else {
        showToast?.(res?.message || "Failed to update status", "error");
      }
    } catch (err) {
      showToast?.(err?.message || "Failed to update status", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleInspectUser = async (userId) => {
    if (!token) return;
    try {
      const res = await getUser(userId, token);
      if (res?.success && res.user) {
        setSelectedUser(res.user);
      }
    } catch {
      // Fallback
    }
  };

  const handleExport = () => {
    downloadCsv(
      "users.csv",
      ["Name", "Email", "Phone", "Role", "Status", "Joined"],
      users.map((u) => [
        u.name || "",
        u.email || "",
        u.phoneNumber || "",
        u.role || "CUSTOMER",
        u.status || "ACTIVE",
        formatShortDate(u.createdAt),
      ])
    );
  };

  if (profileLoaded && !token) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto my-8">
        <p className="text-sm font-semibold text-slate-900 mb-3">Sign in required</p>
        <Link
          href="/auth/login?redirect=/dashboard/users"
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
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">User List</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage roles and account statuses</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={users.length === 0}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer disabled:opacity-50"
            aria-label="Refresh users"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 4-Card Summary Strip */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Users"
          value={summary.total}
          subtitle="Registered accounts"
          icon={UsersIcon}
        />
        <StatCard
          title="Active (Page)"
          value={summary.activeCount}
          subtitle={`Out of ${users.length} shown`}
          icon={UserCheck}
        />
        <StatCard
          title="Hosts (Page)"
          value={summary.hostCount}
          subtitle="Fleet owners"
          icon={UserPlus}
        />
        <StatCard
          title="Admins (Page)"
          value={summary.adminCount}
          subtitle="System operators"
          icon={ShieldCheck}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Filter users..."
              className="w-full h-8 text-xs pl-8 pr-3 rounded-lg border border-slate-200 bg-white focus:border-slate-400 outline-none"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
            className="h-8 text-xs font-medium px-2.5 rounded-lg border border-dashed border-slate-300 bg-white text-slate-700 cursor-pointer"
          >
            <option value="ALL">+ Role: All</option>
            <option value="CUSTOMER">Role: Customer</option>
            <option value="HOST">Role: Host</option>
            <option value="ADMIN">Role: Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="h-8 text-xs font-medium px-2.5 rounded-lg border border-dashed border-slate-300 bg-white text-slate-700 cursor-pointer"
          >
            <option value="ALL">+ Status: All</option>
            <option value="ACTIVE">Status: Active</option>
            <option value="SUSPENDED">Status: Suspended</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="shrink-0 flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table Card */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-lg skeleton-shimmer" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 flex-1 flex items-center justify-center">
            No users found.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[760px]">
              <thead className="sticky top-0 z-10 bg-slate-50/95 border-b border-slate-200 text-[11px] font-medium text-slate-500">
                <tr>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Phone Number</th>
                  <th className="py-2.5 px-4">Registered Date</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = currentUser?._id && String(currentUser._id) === String(u._id);
                  return (
                    <tr key={u._id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleInspectUser(u._id)}
                          className="font-medium text-slate-900 hover:underline cursor-pointer text-left"
                        >
                          {u.name || "Unnamed"}
                        </button>
                        {isSelf && (
                          <span className="ml-1.5 text-[10px] text-slate-400">(You)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{u.email}</td>
                      <td className="py-2.5 px-4 text-slate-600 tabular-nums">
                        {u.phoneNumber || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatShortDate(u.createdAt)}
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={u.status || "ACTIVE"} />
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          value={u.role || "CUSTOMER"}
                          disabled={busyId === u._id || isSelf}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          aria-label="User role"
                          className="h-7 text-xs font-medium px-2 rounded-lg border border-slate-200 bg-white cursor-pointer disabled:opacity-50"
                        >
                          <option value="CUSTOMER">Customer</option>
                          <option value="HOST">Host</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleInspectUser(u._id)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                            aria-label="View user details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {!isSelf && (
                            <button
                              type="button"
                              disabled={busyId === u._id}
                              onClick={() => handleToggleStatus(u)}
                              className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50 ${
                                u.status === "SUSPENDED"
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-rose-600"
                              }`}
                            >
                              {u.status === "SUSPENDED" ? "Activate" : "Suspend"}
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

        {!loading && users.length > 0 && (
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

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">User details</h3>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Name</span>
                <span className="font-semibold text-slate-900">{selectedUser.name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="font-medium text-slate-800">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone</span>
                <span className="font-medium text-slate-800">{selectedUser.phoneNumber || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Role</span>
                <StatusBadge status={selectedUser.role} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={selectedUser.status || "ACTIVE"} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Driver license ID</span>
                <span className="font-mono text-slate-800">
                  {selectedUser.driverLicense?.idNumber || "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">License status</span>
                <span className="font-medium text-slate-800">
                  {selectedUser.driverLicense?.verifiedStatus || "UNVERIFIED"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

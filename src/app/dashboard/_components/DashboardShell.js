"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  CalendarCheck,
  Users,
  CreditCard,
  ArrowLeft,
  Menu,
  X,
  LogIn,
  ShieldAlert,
  PanelLeft,
  Search,
  ChevronRight,
} from "lucide-react";
import { getMe } from "@/lib/api";
import { session } from "@/lib/kid-auth";
import { getDashboardToken } from "./StatusBadge";

const DashboardContext = createContext({
  user: null,
  token: null,
  profileLoaded: false,
  refreshProfile: async () => {},
});

export function useDashboard() {
  return useContext(DashboardContext);
}

const NAV_GROUPS = [
  {
    title: "General",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/cars", label: "Fleet", icon: Car },
      { href: "/dashboard/bookings", label: "Bookings", icon: CalendarCheck },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/dashboard/users", label: "Users", icon: Users, adminOnly: true },
      { href: "/dashboard/payments", label: "Payments", icon: CreditCard, adminOnly: true },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export default function DashboardShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [quickQuery, setQuickQuery] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadProfile = useCallback(async () => {
    const t = getDashboardToken();
    let localUser = null;
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("user");
        if (stored) localUser = JSON.parse(stored);
        else localUser = session.getUser();
      } catch {
        // Ignore parse error
      }
    }

    setToken(t);
    if (localUser) setUser(localUser);

    if (!t) {
      setProfileLoaded(true);
      return;
    }

    try {
      const res = await getMe(t);
      if (res?.success && res.user) {
        setUser(res.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(res.user));
        }
      }
    } catch {
      // Keep local fallback
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) void loadProfile();
    });
    return () => {
      active = false;
    };
  }, [loadProfile]);

  const role = String(user?.role || "").toUpperCase();
  const isAuthorized = role === "ADMIN" || role === "HOST";

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || role === "ADMIN"),
  })).filter((group) => group.items.length > 0);

  const visibleItems = visibleGroups.flatMap((g) => g.items);

  const isNavActive = (item) =>
    item.exact ? pathname === item.href : pathname?.startsWith(item.href);

  const currentTab = ALL_NAV_ITEMS.find((item) => isNavActive(item)) || visibleItems[0];

  const matchingRoutes = visibleItems.filter((item) =>
    item.label.toLowerCase().includes(quickQuery.trim().toLowerCase())
  );

  if (!profileLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm bg-white border border-slate-200/80 rounded-2xl p-7 text-center space-y-4 shadow-xs">
          <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
            <LogIn className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Sign in required</h1>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with a Host or Admin account to continue.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <Link
              href="/auth/login?redirect=/dashboard"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold no-underline transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold no-underline transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm bg-white border border-slate-200/80 rounded-2xl p-7 text-center space-y-4 shadow-xs">
          <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Not authorized</h1>
            <p className="text-xs text-slate-500 mt-1">
              Dashboard access is restricted to Host and Admin accounts.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold no-underline transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to home</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DashboardContext.Provider
      value={{ user, token, profileLoaded, refreshProfile: loadProfile }}
    >
      <div className="h-screen overflow-hidden flex bg-[#f8fafc] text-slate-900">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 h-full shrink-0 bg-white border-r border-slate-200/80 flex flex-col transition-all duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${sidebarCollapsed ? "lg:w-16" : "w-60"}`}
        >
          {/* Brand Header (Fixed) */}
          <div className="h-14 px-3.5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 min-w-0 text-sm font-bold text-slate-900 tracking-tight no-underline"
            >
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center shrink-0">
                <img src="/blue-logo.png" alt="DriveKH" width={24} height={24} className="object-contain" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="truncate leading-tight">
                    Drive<span className="text-blue-600">KH</span>
                  </div>
                  <div className="text-[10px] font-medium text-slate-400 leading-tight truncate">
                    {role === "ADMIN" ? "Admin Console" : "Host Console"}
                  </div>
                </div>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 lg:hidden cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs (Scroll Y only) */}
          <nav className="flex-1 min-h-0 p-2.5 space-y-4 overflow-y-auto" aria-label="Dashboard navigation">
            {visibleGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                {!sidebarCollapsed && (
                  <div className="px-2.5 pt-1 pb-0.5 text-[11px] font-medium text-slate-400">
                    {group.title}
                  </div>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavActive(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors no-underline ${
                        sidebarCollapsed ? "justify-center" : ""
                      } ${
                        active
                          ? "bg-slate-100 text-slate-900 font-semibold"
                          : "text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? "text-slate-900" : "text-slate-400"
                        }`}
                      />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Footer Account & Storefront Link (Fixed) */}
          <div className="p-2.5 border-t border-slate-200/80 space-y-1.5 shrink-0">
            <Link
              href="/"
              title={sidebarCollapsed ? "Back to storefront" : undefined}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 no-underline transition-colors ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              {!sidebarCollapsed && <span>Back to storefront</span>}
            </Link>

            {user && (
              <div
                className={`flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200/70 ${
                  sidebarCollapsed ? "justify-center" : ""
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {(user.name?.[0] || user.email?.[0] || "U").toUpperCase()}
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {user.name || "Account"}
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 shrink-0">
                        {role}
                      </span>
                    </div>
                    {user.email && (
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Column */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {/* Top Bar (Fixed) */}
          <header className="h-14 shrink-0 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden cursor-pointer"
                aria-label="Open menu"
              >
                <Menu className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((v) => !v)}
                className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                aria-label="Toggle sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>

              {/* Quick Jump Search */}
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={quickQuery}
                  onFocus={() => setQuickOpen(true)}
                  onBlur={() => setTimeout(() => setQuickOpen(false), 150)}
                  onChange={(e) => {
                    setQuickQuery(e.target.value);
                    setQuickOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && matchingRoutes[0]) {
                      router.push(matchingRoutes[0].href);
                      setQuickQuery("");
                      setQuickOpen(false);
                    }
                  }}
                  placeholder="Jump to page..."
                  aria-label="Jump to dashboard page"
                  className="w-full h-8 text-xs pl-8 pr-3 rounded-lg border border-slate-200/90 bg-slate-50/70 focus:bg-white focus:border-slate-400 outline-none"
                />
                {quickOpen && matchingRoutes.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                    {matchingRoutes.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.href}
                          type="button"
                          onMouseDown={() => {
                            router.push(item.href);
                            setQuickQuery("");
                            setQuickOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer text-left"
                        >
                          <Icon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Subtle Breadcrumb Pill on Right */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <Link href="/" className="hover:text-slate-900 no-underline">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <Link href="/dashboard" className="hover:text-slate-900 no-underline">
                Dashboard
              </Link>
              {currentTab && currentTab.href !== "/dashboard" && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                  <span className="font-medium text-slate-900">{currentTab.label}</span>
                </>
              )}
            </div>
          </header>

          {/* Active Tab Page Content (Full width & height fit) */}
          <main className="flex-1 min-h-0 w-full p-4 sm:p-6 flex flex-col overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Mail, Phone, Wallet, ExternalLink, Copy, Check, ArrowLeft, LayoutDashboard } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getMe } from "@/lib/api";
import { session } from "@/lib/kid-auth";

function truncate(str, head = 8, tail = 6) {
  if (!str || str.length <= head + tail + 3) return str;
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

export default function KIDProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    });
  };

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("token") || sessionStorage.getItem("kid_access_token")
          : null;

      let localUser = session.getUser();
      if (!localUser && typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("user");
          if (stored) localUser = JSON.parse(stored);
        } catch {}
      }

      if (!session.isSignedIn() && !token) {
        router.replace("/auth/login");
        return;
      }

      if (active && localUser) {
        setUser(localUser);
      }

      if (token) {
        try {
          const res = await getMe(token);
          if (active && res?.success && res.user) {
            const merged = { ...(localUser || {}), ...res.user };
            setUser(merged);
            localStorage.setItem("user", JSON.stringify(merged));
          }
        } catch {
          // Keep local fallback
        }
      }

      if (active) setLoading(false);
    }

    Promise.resolve().then(() => {
      if (active) void loadProfile();
    });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const refreshToken = session.getRefreshToken();
      await fetch("/api/auth/kid/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Non-fatal
    } finally {
      session.clear();
      router.push("/auth/login");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const userRole = String(user.role || "").toUpperCase();
  const canAccessDashboard = userRole === "ADMIN" || userRole === "HOST";

  return (
    <>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8 sm:py-10 space-y-5">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 no-underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </Link>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>KID Verified</span>
          </span>
        </div>

        {/* Identity Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center shrink-0">
              {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.picture} alt={user.name ?? "User"} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {(user.given_name?.[0] ?? user.name?.[0] ?? "K").toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 truncate">
                  {(user.name ?? `${user.given_name ?? ""} ${user.family_name ?? ""}`.trim()) || "KID User"}
                </h1>
                {canAccessDashboard && (
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-900 text-white shrink-0">
                    {userRole}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {user.kid ?? `@${user.preferred_username ?? user.sub?.slice(0, 12)}`}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {user.email && (
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-slate-500">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </span>
                <span className="font-medium text-slate-900 truncate">{user.email}</span>
              </div>
            )}
            {(user.phone_number || user.phoneNumber) && (
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-slate-500">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Phone</span>
                </span>
                <span className="font-medium text-slate-900">{user.phone_number || user.phoneNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Selendra Wallet */}
        {user.wallet_address && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Wallet className="w-4 h-4 text-slate-500" />
                <span>Selendra EVM Wallet</span>
              </span>
              <a
                href={`https://explorer.selendra.org/address/${user.wallet_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline no-underline"
              >
                <span>Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              <span className="font-mono text-xs text-slate-700 truncate">
                {truncate(user.wallet_address, 12, 8)}
              </span>
              <button
                id="copy-wallet-btn"
                type="button"
                onClick={() => copy(user.wallet_address, "wallet")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer shrink-0"
              >
                {copiedKey === "wallet" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === "wallet" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Button (Visible only for ADMIN or HOST) */}
        {canAccessDashboard && (
          <Link
            href="/dashboard"
            className="w-full py-3 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-blue-600 text-white transition-colors flex items-center justify-center gap-2 no-underline"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Open Dashboard</span>
          </Link>
        )}

        {/* Sign Out */}
        <button
          id="kid-signout-btn"
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full py-3 rounded-xl font-semibold text-xs bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </main>
    </>
  );
}

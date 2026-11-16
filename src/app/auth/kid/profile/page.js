"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Mail,
  Phone,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  ArrowLeft,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  KeyRound,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { getMe } from "@/lib/api";
import { session, getKidConnectUrl } from "@/lib/kid-auth";

function truncate(str, head = 8, tail = 6) {
  if (!str || str.length <= head + tail + 3) return str;
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

function TelegramIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
    </svg>
  );
}

function GoogleIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
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
        <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-rose-600 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const userRole = String(user.role || "CUSTOMER").toUpperCase();
  const canAccessDashboard = userRole === "ADMIN" || userRole === "HOST";

  const telegramUsername =
    user.telegramUsername || user.telegram_username || "";
  const telegramId = user.telegramId || user.telegram_id || "";
  const hasTelegram = Boolean(telegramUsername || telegramId);

  const email = user.email || "";
  const isGmail = email.toLowerCase().endsWith("@gmail.com");
  const isSyntheticEmail = email.includes("@kid.user");
  const hasValidEmail = Boolean(email && !isSyntheticEmail);
  const isEmailVerified = Boolean(user.emailVerified ?? user.email_verified ?? hasValidEmail);

  const phone = user.phoneNumber || user.phone_number || user.phone || "";
  const isPhoneVerified = Boolean(user.phoneVerified ?? user.phone_number_verified ?? phone);

  const walletAddress = user.walletAddress || user.wallet_address || "";
  const kidNumber = user.kid || "";
  const preferredUsername = user.preferredUsername || user.preferred_username || "";
  const avatarUrl = user.picture || "";
  const displayName =
    user.name ||
    (user.given_name ? `${user.given_name} ${user.family_name || ""}`.trim() : "") ||
    (kidNumber ? `KID User #${kidNumber}` : "KOOMPI ID User");

  return (
    <>
      <Navbar />
      <main className="max-w-xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-5">
        {/* Top bar navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 no-underline transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>KID Single Sign-On</span>
          </div>
        </div>

        {/* Identity Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-slate-100 text-center sm:text-left">
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-rose-500 to-indigo-600 p-0.5 shadow-md shrink-0">
              <div className="w-full h-full rounded-[14px] overflow-hidden bg-slate-900 flex items-center justify-center">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-white text-2xl font-bold tracking-tight">
                    {(displayName[0] || "K").toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white" title="Active Account" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  {displayName}
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-900 text-white shadow-xs">
                  {userRole}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-500 font-mono">
                {kidNumber && (
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                    <Sparkles className="w-3 h-3 text-rose-500" />
                    <span>KID #{kidNumber}</span>
                  </span>
                )}
                {preferredUsername && (
                  <span className="text-slate-600 font-medium">@{preferredUsername}</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Connected via KOOMPI ID Identity Provider
              </p>
            </div>
          </div>

          {/* Connected Profiles: Telegram & Gmail & Phone */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Connected Credentials
            </h2>

            {/* Telegram Profile */}
            <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#24A1DE]/10 text-[#24A1DE] flex items-center justify-center shrink-0">
                  <TelegramIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">Telegram</span>
                    {hasTelegram && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Connected</span>
                      </span>
                    )}
                  </div>
                  {hasTelegram ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      {telegramUsername ? (
                        <a
                          href={`https://t.me/${telegramUsername.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#24A1DE] hover:underline inline-flex items-center gap-1 no-underline truncate"
                        >
                          <span>@{telegramUsername.replace(/^@/, "")}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-600 font-mono">
                          ID: #{telegramId}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">Not linked to KOOMPI ID</p>
                  )}
                </div>
              </div>

              {!hasTelegram ? (
                <a
                  href={getKidConnectUrl("telegram")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-[#24A1DE] text-[#24A1DE] text-xs font-semibold transition-colors no-underline shrink-0"
                >
                  Link Telegram
                </a>
              ) : (
                <span className="text-[11px] font-medium text-slate-400 shrink-0">
                  via KID
                </span>
              )}
            </div>

            {/* Google / Gmail Profile */}
            <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-xs">
                  {isGmail ? (
                    <GoogleIcon className="w-5 h-5" />
                  ) : (
                    <Mail className="w-5 h-5 text-rose-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      {isGmail ? "Google / Gmail" : "Email Address"}
                    </span>
                    {hasValidEmail && isEmailVerified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>
                  {hasValidEmail ? (
                    <p className="text-xs font-medium text-slate-800 truncate mt-0.5">
                      {email}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">
                      No Google/Gmail linked
                    </p>
                  )}
                </div>
              </div>

              {!hasValidEmail ? (
                <a
                  href={getKidConnectUrl("google")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 text-blue-600 text-xs font-semibold transition-colors no-underline shrink-0"
                >
                  Link Google
                </a>
              ) : (
                <span className="text-[11px] font-medium text-slate-400 shrink-0">
                  {isGmail ? "Gmail" : "Email"}
                </span>
              )}
            </div>

            {/* Phone Number */}
            <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">Phone Number</span>
                    {phone && isPhoneVerified && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-800 mt-0.5">
                    {phone || "Not provided"}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-slate-400 shrink-0">
                KID Contact
              </span>
            </div>
          </div>

          {/* Selendra EVM Wallet */}
          {walletAddress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                  <span>Selendra EVM Wallet</span>
                </span>
                <a
                  href={`https://explorer.selendra.org/address/${walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline no-underline"
                >
                  <span>Block Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                <span className="font-mono text-xs text-slate-700 truncate">
                  {truncate(walletAddress, 14, 10)}
                </span>
                <button
                  id="copy-wallet-btn"
                  type="button"
                  onClick={() => copy(walletAddress, "wallet")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer shrink-0"
                >
                  {copiedKey === "wallet" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === "wallet" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          )}

          {/* KID Subject identifier (sub) */}
          {user.sub && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <KeyRound className="w-3 h-3" />
                <span>Subject ID: {truncate(user.sub, 8, 6)}</span>
              </span>
              <button
                type="button"
                onClick={() => copy(user.sub, "sub")}
                className="hover:text-slate-700 cursor-pointer font-sans text-[11px] font-semibold"
              >
                {copiedKey === "sub" ? "Copied!" : "Copy sub"}
              </button>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5">
          {canAccessDashboard && (
            <Link
              href="/dashboard"
              className="w-full py-3.5 rounded-2xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm flex items-center justify-center gap-2 no-underline"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Open Host / Admin Dashboard</span>
            </Link>
          )}

          <a
            href="https://kid.koompi.org"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-2xl font-semibold text-xs bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 no-underline"
          >
            <span>Manage KOOMPI ID Account & Security</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          <button
            id="kid-signout-btn"
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full py-3 rounded-2xl font-semibold text-xs bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </main>
    </>
  );
}

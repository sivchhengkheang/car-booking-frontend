"use client";
/**
 * KID User Profile Page
 * Route: /auth/kid/profile
 *
 * Displays the authenticated user's KID identity including:
 * - Avatar, full name, KID identity number (e.g. "KID-000001")
 * - Email, phone (from profile.contact scope)
 * - Selendra EVM wallet address and public key (from wallet.read scope)
 * - Sign-out button that revokes the refresh token server-side then clears session
 *
 * KID docs notes:
 * - All user data comes from the token response `user` field — already in session.
 * - `sub` is the stable user identifier; display `kid` (e.g. KID-000001) to users.
 * - `wallet_address` is on the Selendra EVM chain (chain_id 1961).
 * - Sign-out must revoke the refresh token via POST /oauth/revoke (RFC 7009).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { session } from "@/lib/kid-auth";

/** Copies text to clipboard and returns a short-lived "Copied!" signal. */
function useCopyToClipboard() {
  const [copiedKey, setCopiedKey] = useState(null);
  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    });
  };
  return { copiedKey, copy };
}

/** Truncates a long string (e.g. wallet address) for display. */
function truncate(str, head = 8, tail = 6) {
  if (!str || str.length <= head + tail + 3) return str;
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

export default function KIDProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const { copiedKey, copy } = useCopyToClipboard();

  useEffect(() => {
    // Guard: redirect to login if no session
    if (!session.isSignedIn()) {
      router.replace("/auth/login");
      return;
    }
    setUser(session.getUser());
    setLoading(false);
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      // Revoke the refresh token server-side (RFC 7009 — always 200 OK)
      const refreshToken = session.getRefreshToken();
      await fetch("/api/auth/kid/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Non-fatal — clear local session regardless
    } finally {
      session.clear();
      router.push("/auth/login");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 rounded-full border-4 border-brand-primary/20 border-t-brand-primary animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const isEmailVerified = user.email_verified;
  const isPhoneVerified = user.phone_number_verified;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff0f3] via-white to-[#fff8f0] py-10 px-4">
      <div className="max-w-lg mx-auto flex flex-col gap-5">

        {/* ── Top Bar ──────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-[11px] font-bold text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1"
          >
            ← Back to DriveKH
          </Link>
          <span className="text-[10px] font-semibold text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">
            KID Authenticated
          </span>
        </div>

        {/* ── Identity Card ─────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Gradient header */}
          <div className="bg-brand-primary px-6 pt-8 pb-16 relative">
            <div className="absolute top-4 right-5 text-[10px] font-mono font-bold text-white/70 bg-white/10 px-2 py-1 rounded-full">
              {user.kid ?? "KID-XXXXXX"}
            </div>
            <h1 className="text-white text-xl font-black tracking-tight">
              {(user.name ?? `${user.given_name ?? ""} ${user.family_name ?? ""}`.trim()) || "KID User"}
            </h1>
            <p className="text-white/70 text-xs mt-0.5 font-medium">
              @{user.preferred_username ?? user.sub?.slice(0, 12)}
            </p>
          </div>

          {/* Avatar — overlaps gradient */}
          <div className="px-6 -mt-10 mb-4 flex items-end justify-between">
            <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-brand-primary flex items-center justify-center">
              {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture}
                  alt={user.name ?? "KID user avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-3xl font-black select-none">
                  {(user.given_name?.[0] ?? user.name?.[0] ?? "K").toUpperCase()}
                </span>
              )}
            </div>

            {/* Verified badge */}
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2z" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              KID Verified
            </div>
          </div>

          {/* Contact details */}
          <div className="px-6 pb-6 flex flex-col gap-3">
            {user.email && (
              <InfoRow
                icon="✉️"
                label="Email"
                value={user.email}
                badge={isEmailVerified ? "Verified" : "Unverified"}
                badgeColor={isEmailVerified ? "emerald" : "amber"}
              />
            )}
            {user.phone_number && (
              <InfoRow
                icon="📱"
                label="Phone"
                value={user.phone_number}
                badge={isPhoneVerified ? "Verified" : "Unverified"}
                badgeColor={isPhoneVerified ? "emerald" : "amber"}
              />
            )}
            {/* Stable user ID */}
            <InfoRow
              icon="🪪"
              label="User ID (sub)"
              value={truncate(user.sub, 10, 8)}
              note="Stable identifier — use as foreign key"
            />
          </div>
        </div>

        {/* ── Wallet Card ───────────────────────────────────── */}
        <div className="bg-gradient-to-br from-[#0f0f1a] to-[#1a1033] rounded-3xl shadow-xl border border-white/5 overflow-hidden">
          <div className="px-6 pt-5 pb-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">
                Selendra EVM Wallet
              </p>
              <p className="text-white/60 text-[10px] mt-0.5 font-mono">Chain ID: 1961</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-base">
              💎
            </div>
          </div>

          <div className="px-6 pt-3 pb-5 flex flex-col gap-4">
            {user.wallet_address ? (
              <>
                {/* Wallet Address */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">
                    Wallet Address
                  </span>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <span className="flex-1 font-mono text-xs text-white/80 truncate">
                      {user.wallet_address}
                    </span>
                    <button
                      id="copy-wallet-btn"
                      onClick={() => copy(user.wallet_address, "wallet")}
                      className="text-[10px] font-bold text-purple-400 hover:text-purple-200 transition-colors cursor-pointer shrink-0"
                    >
                      {copiedKey === "wallet" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Public Key */}
                {user.public_key && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">
                      Public Key
                    </span>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                      <span className="flex-1 font-mono text-[11px] text-white/60 truncate">
                        {truncate(user.public_key, 14, 10)}
                      </span>
                      <button
                        id="copy-pubkey-btn"
                        onClick={() => copy(user.public_key, "pubkey")}
                        className="text-[10px] font-bold text-purple-400 hover:text-purple-200 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedKey === "pubkey" ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Selendra Explorer link */}
                <a
                  href={`https://explorer.selendra.org/address/${user.wallet_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="selendra-explorer-link"
                  className="text-center text-[11px] font-bold text-purple-400 hover:text-purple-200 transition-colors py-2"
                >
                  View on Selendra Explorer ↗
                </a>
              </>
            ) : (
              <div className="text-white/40 text-xs text-center py-4">
                Wallet not available — ensure <code className="font-mono">wallet.read</code> scope was granted.
              </div>
            )}
          </div>
        </div>

        {/* ── Session Info ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            Session Details
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Scopes granted</span>
              <span className="font-mono font-semibold text-gray-700 text-[10px]">
                openid · profile.basic · profile.contact · wallet.read
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Identity Provider</span>
              <span className="font-semibold text-gray-700">KID by KOOMPI</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Chain</span>
              <span className="font-semibold text-gray-700">Selendra EVM (1961)</span>
            </div>
          </div>
        </div>

        {/* ── Sign Out ──────────────────────────────────────── */}
        <button
          id="kid-signout-btn"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full py-4 rounded-2xl font-bold text-sm bg-white border-2 border-gray-200 text-gray-700 hover:border-brand-primary hover:text-brand-primary transition-all cursor-pointer disabled:opacity-50 shadow-sm"
        >
          {signingOut ? "Signing out…" : "Sign out of KID"}
        </button>

        <p className="text-center text-[10px] text-gray-400 pb-4">
          Signing out revokes your KID session on this device.
        </p>
      </div>
    </div>
  );
}

/** Reusable row for displaying a labelled piece of user info */
function InfoRow({ icon, label, value, badge, badgeColor, note }) {
  const colors = {
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
  };
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
          <span>{icon}</span> {label}
        </span>
        {badge && (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${colors[badgeColor] ?? colors.emerald}`}>
            {badge}
          </span>
        )}
      </div>
      <span className="text-sm font-semibold text-gray-800 font-mono truncate">{value}</span>
      {note && <span className="text-[10px] text-gray-400 italic">{note}</span>}
    </div>
  );
}

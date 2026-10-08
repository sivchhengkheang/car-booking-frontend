"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { loginUser } from "@/lib/api";
import { redirectToKID } from "@/lib/kid-auth";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await loginUser(email, password);
      if (data.success) {
        const token = data.accessToken || data.token;
        if (token) localStorage.setItem("token", token);
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        router.push(redirect);
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch {
      setError("Something went wrong — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-4 bg-gray-50/50">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl p-8 shadow-xl">
          {/* Header */}
          <div className="text-center pb-6 border-b border-gray-200 mb-6">
            <h1 className="text-xl font-bold text-gray-900">Welcome to DriveKH</h1>
            <p className="text-xs text-gray-500 mt-1">Log in to manage your car bookings</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sokha@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-semibold bg-transparent border-0 cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-1.5">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold bg-brand-primary hover:bg-brand-hover  shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Continue"}
            </button>
          </form>
          {/* ── KID SSO Divider ─────────────────────────────── */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                or continue with
              </span>
            </div>
          </div>

          {/* KID Sign-In Button */}
          <button
            id="kid-signin-btn"
            type="button"
            onClick={redirectToKID}
            className="w-full relative overflow-hidden group flex items-center justify-between py-3.5 px-5 rounded-2xl font-bold text-sm bg-gradient-to-r from-red-600 via-rose-600 to-[#FF385C] text-white shadow-md shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/35 hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer border border-white/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2z" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-extrabold text-white leading-tight flex items-center gap-1.5">
                  Sign in with KID
                  <span className="text-[9px] bg-white text-red-600 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">SSO</span>
                </div>
                <div className="text-[11px] text-white/80 font-medium">KOOMPI ID · Email, Google, Apple &amp; Telegram</div>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white text-xs group-hover:translate-x-1 transition-transform">
              →
            </div>
          </button>

          <p className="text-center text-[11px] text-gray-500 mt-2 font-medium">
            Unified digital identity &amp; wallet on Selendra EVM
          </p>

          {/* Security Callout */}
          <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-[11px] text-gray-500">
            <span>🛡️</span>
            <span>Secured with AirCover & KHQR Encryption</span>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="text-brand-primary font-bold hover:underline no-underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}

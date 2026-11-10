"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";
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
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="min-h-[calc(100vh-80px)] flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Sign in</h1>
            <p className="text-xs text-slate-500 mt-0.5">Access your reservations</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 outline-none pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-medium cursor-pointer"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-3 px-4 rounded-xl font-semibold text-xs text-white bg-slate-900 hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Continue"}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[11px] font-medium text-slate-400">or</span>
            </div>
          </div>

          <button
            id="kid-signin-btn"
            type="button"
            onClick={redirectToKID}
            className="w-full flex items-center justify-between py-3 px-4 rounded-xl font-semibold text-xs bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Continue with KOOMPI ID</span>
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="text-blue-600 font-semibold hover:underline no-underline">
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500 text-xs">Loading…</div>}>
      <LoginContent />
    </Suspense>
  );
}

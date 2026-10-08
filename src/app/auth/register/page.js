"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { registerUser } from "@/lib/api";
import { redirectToKID } from "@/lib/kid-auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", phoneNumber: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await registerUser({ ...form, role: "CUSTOMER" });
      if (data.success) {
        const token = data.accessToken || data.token;
        if (token) localStorage.setItem("token", token);
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        router.push("/");
      } else {
        setError(data.message || "Registration failed");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-4 bg-gray-50/50">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl p-8 shadow-xl">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Create account</h1>
          <p className="text-xs text-gray-500 mb-6">Start renting premium cars in Cambodia</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-700 mb-1">Full Name</label>
              <input className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" type="text" value={form.name} onChange={set("name")}
                placeholder="Sokha Chan" required />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-700 mb-1">Email</label>
              <input className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" type="email" value={form.email} onChange={set("email")}
                placeholder="sokha@example.com" required />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-700 mb-1">Phone Number</label>
              <input className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" type="tel" value={form.phoneNumber} onChange={set("phoneNumber")}
                placeholder="+855 12 345 678" required />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-700 mb-1">Password</label>
              <input className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all" type="password" value={form.password} onChange={set("password")}
                placeholder="Min. 8 characters" required minLength={8} />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-1.5">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold bg-brand-primary hover:bg-brand-hover text-white shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-50" type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>

          {/* ── KID SSO Divider ─────────────────────────────── */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                or sign up with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={redirectToKID}
            className="w-full relative overflow-hidden group flex items-center justify-between py-3 px-4 rounded-2xl font-bold text-xs bg-gradient-to-r from-red-600 via-rose-600 to-[#FF385C] text-white shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all cursor-pointer border border-white/20"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white">
                🛡️
              </div>
              <div className="text-left">
                <div className="font-extrabold text-white">Sign up with KID</div>
                <div className="text-[10px] text-white/80">No password needed · Selendra EVM</div>
              </div>
            </div>
            <div className="text-white text-xs">→</div>
          </button>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-brand-primary font-bold hover:underline no-underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

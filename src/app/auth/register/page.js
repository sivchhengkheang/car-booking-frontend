"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";
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

      <main className="min-h-[calc(100vh-80px)] flex items-center justify-center py-10 px-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900">Create account</h1>
            <p className="text-xs text-slate-500 mt-0.5">Book and manage your trips</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full name</label>
              <input
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 outline-none"
                type="text"
                value={form.name}
                onChange={set("name")}
                placeholder="Sokha Chan"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 outline-none"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone number</label>
              <input
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 outline-none"
                type="tel"
                value={form.phoneNumber}
                onChange={set("phoneNumber")}
                placeholder="+855 12 345 678"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <input
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 outline-none"
                type="password"
                value={form.password}
                onChange={set("password")}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              className="w-full mt-1 py-3 px-4 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-blue-600 text-white transition-colors cursor-pointer disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create account"}
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
              Already have an account?{" "}
              <Link href="/auth/login" className="text-blue-600 font-semibold hover:underline no-underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

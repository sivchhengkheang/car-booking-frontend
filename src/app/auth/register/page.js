"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/api";

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
        localStorage.setItem("token", data.token);
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
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link href="/" className="nav-logo">🚗 DriveKH</Link>
        </div>
      </nav>

      <div className="container page-padding" style={{ display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ width: "100%", maxWidth: 440, padding: "2.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.35rem" }}>Create account</h1>
          <p className="text-muted mb-8">Start renting premium cars in Cambodia</p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="form-group">
              <label>Full Name</label>
              <input className="input" type="text" value={form.name} onChange={set("name")}
                placeholder="Sokha Chan" required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="input" type="email" value={form.email} onChange={set("email")}
                placeholder="sokha@example.com" required />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input className="input" type="tel" value={form.phoneNumber} onChange={set("phoneNumber")}
                placeholder="+855 12 345 678" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input className="input" type="password" value={form.password} onChange={set("password")}
                placeholder="Min. 8 characters" required minLength={8} />
            </div>

            {error && <p className="error-text">⚠️ {error}</p>}

            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" />Creating account…</> : "Create Account →"}
            </button>
          </form>

          <div className="divider" />
          <p className="text-center text-muted" style={{ fontSize: "0.875rem" }}>
            Already have an account?{" "}
            <Link href="/auth/login" className="text-gold" style={{ textDecoration: "none", fontWeight: 600 }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

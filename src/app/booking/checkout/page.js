"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getMyBookings, checkoutPayment } from "@/lib/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

const BANK_ICONS = { aba: "🏦", acleda: "🏛️", spn: "💳", wing: "🦋" };

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [paying,  setPaying]    = useState(false);
  const [error,   setError]     = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/auth/login"); return; }
    if (!bookingId) { router.push("/"); return; }

    getMyBookings(token).then((data) => {
      if (data.success) {
        const found = (data.bookings || []).find((b) => b._id === bookingId);
        if (found) setBooking(found);
        else setError("Booking not found");
      } else {
        setError(data.message || "Could not load booking");
      }
    }).catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [bookingId, router]);

  async function handlePay() {
    const token = getToken();
    if (!token) { router.push("/auth/login"); return; }

    setPaying(true);
    setError(null);
    try {
      const data = await checkoutPayment(bookingId, token);
      if (data.success && data.checkout?.paymentUrl) {
        // Redirect customer to Baray hosted payment page
        window.location.href = data.checkout.paymentUrl;
      } else {
        setError(data.message || "Could not create payment intent");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setPaying(false);
    }
  }

  if (loading) return (
    <div className="text-center" style={{ padding: "10rem 0" }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: "0 auto 1rem" }} />
      <p className="text-muted">Loading your booking…</p>
    </div>
  );

  if (error && !booking) return (
    <div className="container page-padding text-center">
      <p className="error-text" style={{ marginBottom: "1rem" }}>⚠️ {error}</p>
      <Link href="/" className="btn btn-ghost">← Back to home</Link>
    </div>
  );

  const car   = booking?.car;
  const start = booking?.startDate ? new Date(booking.startDate) : null;
  const end   = booking?.endDate   ? new Date(booking.endDate)   : null;

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link href="/" className="nav-logo">🚗 DriveKH</Link>
          <Link href={`/booking?carId=${car?._id}`} className="btn btn-ghost" style={{ padding: "0.5rem 1rem" }}>
            ← Change Dates
          </Link>
        </div>
      </nav>

      <div className="container page-padding">
        {/* Steps */}
        <div className="steps">
          <div className="step done"><span className="step-num">✓</span>Select Dates</div>
          <div className="step-line" />
          <div className="step active"><span className="step-num">2</span>Pay</div>
          <div className="step-line" />
          <div className="step"><span className="step-num">3</span>Confirmed</div>
        </div>

        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Review & Pay
          </h1>
          <p className="text-muted mb-6">
            Confirm your rental details before proceeding to secure payment.
          </p>

          {/* Booking summary card */}
          <div className="card" style={{ padding: "1.75rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: "var(--surface-2)", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: "1.75rem",
              }}>🚗</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                  {car?.make} {car?.model}
                </div>
                <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                  {car?.year} · {car?.type || "Sedan"}
                </div>
              </div>
              <span className="badge badge-gold" style={{ marginLeft: "auto" }}>PROVISIONAL</span>
            </div>

            <div className="divider" />

            <div className="summary-row">
              <span className="summary-label">Booking ID</span>
              <span className="summary-value" style={{ fontSize: "0.8rem", fontFamily: "monospace" }}>
                #{booking?._id?.slice(-8).toUpperCase()}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Check-in</span>
              <span className="summary-value">
                {start ? start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Check-out</span>
              <span className="summary-value">
                {end ? end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Duration</span>
              <span className="summary-value">{booking?.totalDays} day{booking?.totalDays > 1 ? "s" : ""}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Rate</span>
              <span className="summary-value">${car?.pricePerDay}/day</span>
            </div>
            <div className="divider" />
            <div className="summary-row summary-total">
              <span className="summary-label">Total Due</span>
              <span className="summary-value">${booking?.totalPrice?.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment methods info */}
          <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
              Accepted Payment Methods
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {[
                { name: "ABA Pay", icon: "🏦" },
                { name: "ACLEDA", icon: "🏛️" },
                { name: "Wing", icon: "🦋" },
                { name: "Sathapana", icon: "💳" },
              ].map((b) => (
                <div key={b.name} style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  background: "var(--surface-2)", padding: "0.4rem 0.85rem",
                  borderRadius: 8, fontSize: "0.85rem",
                }}>
                  <span>{b.icon}</span> {b.name}
                </div>
              ))}
            </div>
            <p className="text-muted" style={{ fontSize: "0.78rem", marginTop: "0.75rem" }}>
              Powered by <strong className="text-gold">Baray</strong> — Cambodia's unified payment API.
              You'll select your bank on the next page.
            </p>
          </div>

          {error && (
            <div className="card" style={{ padding: "1rem", marginBottom: "1rem", borderColor: "rgba(239,68,68,0.4)" }}>
              <p className="error-text">⚠️ {error}</p>
            </div>
          )}

          <button
            className="btn btn-primary btn-full"
            onClick={handlePay}
            disabled={paying}
            style={{ padding: "1rem", fontSize: "1rem" }}
          >
            {paying ? (
              <><span className="spinner" />Creating payment intent…</>
            ) : (
              <>Pay ${booking?.totalPrice?.toFixed(2)} via Baray →</>
            )}
          </button>

          <p className="text-center text-muted" style={{ fontSize: "0.78rem", marginTop: "0.75rem" }}>
            🔒 You will be securely redirected to pay.baray.io to complete payment
          </p>
        </div>
      </div>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container page-padding text-center">Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}


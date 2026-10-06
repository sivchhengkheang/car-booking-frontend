"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getMyBookings } from "@/lib/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token || !bookingId) { setLoading(false); return; }

    // Poll briefly to let webhook confirm the booking (Baray is near-instant)
    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const data = await getMyBookings(token);
        if (cancelled) return;
        if (data.success) {
          const found = (data.bookings || []).find((b) => b._id === bookingId);
          if (found) {
            setBooking(found);
            // If still PENDING, retry a couple times (webhook may be slightly delayed)
            if (found.paymentStatus === "PENDING" && attempts < 3) {
              attempts++;
              setTimeout(poll, 1500);
              return;
            }
          }
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch booking status:", err);
        setError("Could not reach the server. Please check your bookings manually.");
      }
      if (!cancelled) setLoading(false);
    };

    poll();

    // Cleanup: cancel polling if component unmounts (e.g. user navigates away)
    return () => { cancelled = true; };
  }, [bookingId]);

  const car   = booking?.car;
  const start = booking?.startDate ? new Date(booking.startDate) : null;
  const end   = booking?.endDate   ? new Date(booking.endDate)   : null;
  const ref   = booking?._id?.slice(-8).toUpperCase() || "—";
  const isPaid = booking?.paymentStatus === "PAID";

  const BANK_NAMES = { aba: "ABA Bank", acleda: "ACLEDA Bank", spn: "Sathapana Bank", wing: "Wing" };
  const bankName  = BANK_NAMES[booking?.paymentDetails?.bank] || "Baray Payment";

  if (loading) return (
    <div className="text-center" style={{ padding: "10rem 0" }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: "0 auto 1rem" }} />
      <p className="text-muted">Confirming your payment…</p>
    </div>
  );

  if (error) return (
    <div className="text-center" style={{ padding: "10rem 0" }}>
      <p style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</p>
      <p className="text-muted" style={{ marginBottom: "1.5rem" }}>{error}</p>
      <Link href="/" className="btn btn-outline-gold">Go Home</Link>
    </div>
  );

  return (
    <>
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link href="/" className="nav-logo">🚗 DriveKH</Link>
          <Link href="/" className="btn btn-ghost" style={{ padding: "0.5rem 1rem" }}>Home</Link>
        </div>
      </nav>

      <div className="container page-padding">
        {/* Steps */}
        <div className="steps">
          <div className="step done"><span className="step-num">✓</span>Select Dates</div>
          <div className="step-line" />
          <div className="step done"><span className="step-num">✓</span>Pay</div>
          <div className="step-line" />
          <div className="step active"><span className="step-num">3</span>Confirmed</div>
        </div>

        <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
          {/* Success icon */}
          <div className="success-icon">
            {isPaid ? "✅" : "⏳"}
          </div>

          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            {isPaid ? "Booking Confirmed!" : "Payment Received"}
          </h1>
          <p className="text-muted mb-8">
            {isPaid
              ? `Your payment was processed via ${bankName}. Show your reference code at pickup.`
              : "Your booking is being confirmed. This usually takes a few seconds."}
          </p>

          {/* Reference card */}
          <div className="card" style={{ padding: "2rem", marginBottom: "1.5rem", textAlign: "left" }}>
            {/* Booking reference */}
            <div style={{
              background: "rgba(212,168,67,0.06)",
              border: "1px dashed var(--gold-dim)",
              borderRadius: 12,
              padding: "1.25rem",
              textAlign: "center",
              marginBottom: "1.5rem",
            }}>
              <p style={{ fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                Booking Reference
              </p>
              <p style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "monospace", color: "var(--gold)", letterSpacing: "0.1em" }}>
                #{ref}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Present this code when picking up your vehicle
              </p>
            </div>

            <div className="summary-row">
              <span className="summary-label">Vehicle</span>
              <span className="summary-value">{car?.make} {car?.model} ({car?.year})</span>
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
            <div className="divider" />
            <div className="summary-row summary-total">
              <span className="summary-label">Amount Paid</span>
              <span className="summary-value">${booking?.totalPrice?.toFixed(2)}</span>
            </div>

            {isPaid && booking?.paymentDetails?.bank && (
              <div className="summary-row">
                <span className="summary-label">Payment via</span>
                <span className="summary-value flex items-center gap-2">
                  <span className="badge badge-success">PAID</span>
                  {bankName}
                </span>
              </div>
            )}

            {isPaid && booking?.paymentDetails?.paidAt && (
              <div className="summary-row">
                <span className="summary-label">Paid at</span>
                <span className="summary-value">
                  {new Date(booking.paymentDetails.paidAt).toLocaleString("en-GB")}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <Link href="/" className="btn btn-outline-gold">Browse More Cars</Link>
            <button
              className="btn btn-ghost"
              onClick={() => window.print()}
            >
              🖨️ Print Receipt
            </button>
          </div>

          <p className="text-muted" style={{ fontSize: "0.8rem", marginTop: "1.5rem" }}>
            Questions? Contact the host directly or email support@drivekh.com
          </p>
        </div>
      </div>
    </>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="container page-padding text-center">Loading confirmation...</div>}>
      <SuccessContent />
    </Suspense>
  );
}


/**
 * API helper — all requests to the Express backend.
 * Reads NEXT_PUBLIC_API_URL from .env.local
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function loginUser(email, password) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function registerUser(data) {
  const res = await fetch(`${BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getMe(token) {
  const res = await fetch(`${BASE}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  return res.json();
}

// ─── Cars ─────────────────────────────────────────────────────────────────────

export async function getCars() {
  const res = await fetch(`${BASE}/api/v1/cars`);
  return res.json();
}

export async function getCar(id) {
  const res = await fetch(`${BASE}/api/v1/cars/${id}`);
  return res.json();
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function createBooking({ carId, startDate, endDate }, token) {
  const res = await fetch(`${BASE}/api/v1/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify({ carId, startDate, endDate }),
  });
  return res.json();
}

export async function getMyBookings(token) {
  const res = await fetch(`${BASE}/api/v1/bookings/my`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  return res.json();
}

export async function getBooking(id, token) {
  // Fetch from my bookings list and find by id
  const data = await getMyBookings(token);
  if (!data.success) return data;
  const booking = data.bookings?.find((b) => b._id === id);
  return booking ? { success: true, booking } : { success: false, message: "Booking not found" };
}

// ─── Payments ─────────────────────────────────────────────────────────────────

/**
 * Creates a Baray payment intent.
 * Returns { success, checkout: { paymentUrl, intentId, amount, ... } }
 */
export async function checkoutPayment(bookingId, token) {
  const res = await fetch(`${BASE}/api/v1/payments/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify({ bookingId }),
  });
  return res.json();
}

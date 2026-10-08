/**
 * API helper — all requests to the Express backend.
 * Reads NEXT_PUBLIC_API_URL from .env.local
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─── Token Refresh & Auto-Retry Mechanism ───────────────────────────────────

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Retrieves a valid access token. If current token is expired or close to expiring (within 60s),
 * it automatically refreshes it in the background using the stored refresh token.
 */
export async function getValidAccessToken() {
  if (typeof window === "undefined") return null;

  let token = localStorage.getItem("token") || sessionStorage.getItem("kid_access_token");
  const refreshToken =
    localStorage.getItem("refreshToken") || sessionStorage.getItem("kid_refresh_token");

  if (!refreshToken) return token;

  let isExpired = false;
  if (token) {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.exp && Date.now() >= (payload.exp - 60) * 1000) {
          isExpired = true;
        }
      }
    } catch {
      // Ignore decode error, let network call test it
    }
  } else {
    isExpired = true;
  }

  if (!isExpired) {
    return token;
  }

  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((newToken) => {
        resolve(newToken);
      });
    });
  }

  isRefreshing = true;

  try {
    // 1. Try refreshing with backend Express server
    const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ refreshToken }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && (data.accessToken || data.token)) {
        const newToken = data.accessToken || data.token;
        localStorage.setItem("token", newToken);
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
          sessionStorage.setItem("kid_refresh_token", data.refreshToken);
        }
        isRefreshing = false;
        onRefreshed(newToken);
        return newToken;
      }
    }

    // 2. Fallback: Check if it's a KID OAuth refresh token
    const kidRefreshRes = await fetch("/api/auth/kid/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (kidRefreshRes.ok) {
      const kidTokens = await kidRefreshRes.json();
      if (kidTokens.access_token) {
        const syncRes = await fetch(`${BASE}/api/v1/auth/kid-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: kidTokens.access_token }),
        });

        if (syncRes.ok) {
          const syncData = await syncRes.json();
          const newToken = syncData.accessToken || syncData.token;
          localStorage.setItem("token", newToken);
          if (syncData.refreshToken) {
            localStorage.setItem("refreshToken", syncData.refreshToken);
          }
          if (kidTokens.refresh_token) {
            sessionStorage.setItem("kid_refresh_token", kidTokens.refresh_token);
          }
          sessionStorage.setItem("kid_access_token", kidTokens.access_token);

          isRefreshing = false;
          onRefreshed(newToken);
          return newToken;
        }
      }
    }

    isRefreshing = false;
    onRefreshed(null);
    return token;
  } catch (err) {
    console.error("Auto token refresh failed:", err);
    isRefreshing = false;
    onRefreshed(null);
    return token;
  }
}

/**
 * Universal authenticated fetch wrapper:
 * Automatically injects Bearer token, intercepts 401s, refreshes token, and retries seamlessly.
 */
export async function authFetch(url, options = {}, explicitToken = null) {
  let token = explicitToken || (await getValidAccessToken());

  const headers = { ...(options.headers || {}) };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // If 401 Unauthorized, automatically attempt refresh & retry once
  if (res.status === 401) {
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("refreshToken") || sessionStorage.getItem("kid_refresh_token")
        : null;

    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${BASE}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.success && (refreshData.accessToken || refreshData.token)) {
            const newToken = refreshData.accessToken || refreshData.token;
            if (typeof window !== "undefined") {
              localStorage.setItem("token", newToken);
              if (refreshData.refreshToken) {
                localStorage.setItem("refreshToken", refreshData.refreshToken);
                sessionStorage.setItem("kid_refresh_token", refreshData.refreshToken);
              }
            }

            headers["Authorization"] = `Bearer ${newToken}`;
            res = await fetch(url, {
              ...options,
              headers,
              credentials: "include",
            });
          }
        }
      } catch (retryErr) {
        console.warn("Auto-refresh retry failed:", retryErr);
      }
    }
  }

  return res;
}

// ─── System Health ───────────────────────────────────────────────────────────

export async function getHealth() {
  const res = await fetch(`${BASE}/api/v1/health`);
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function syncKidLogin(kidData) {
  const res = await fetch(`${BASE}/api/v1/auth/kid-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(kidData),
  });
  return res.json();
}

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

export async function refreshAuthToken(refreshToken) {
  const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ refreshToken }),
  });
  return res.json();
}

export async function logoutUser(refreshToken, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api/v1/auth/logout`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ refreshToken }),
  });
  return res.json();
}

export async function forgotPassword(email) {
  const res = await fetch(`${BASE}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
}

export async function resetPassword(token, newPassword) {
  const res = await fetch(`${BASE}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  return res.json();
}

export async function getMe(token) {
  const res = await authFetch(`${BASE}/api/v1/auth/me`, {}, token);
  return res.json();
}

export async function updateProfile(data, token) {
  const res = await authFetch(
    `${BASE}/api/v1/auth/profile`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    token
  );
  return res.json();
}

export async function updatePassword(currentPassword, newPassword, token) {
  const res = await authFetch(
    `${BASE}/api/v1/auth/password`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    },
    token
  );
  return res.json();
}

// ─── Users (Admin) ────────────────────────────────────────────────────────────

export async function getAllUsers(token, query = {}) {
  const qs = new URLSearchParams(query).toString();
  const res = await authFetch(`${BASE}/api/v1/users${qs ? '?' + qs : ''}`, {}, token);
  return res.json();
}

export async function getUser(userId, token) {
  const res = await authFetch(`${BASE}/api/v1/users/${userId}`, {}, token);
  return res.json();
}

export async function updateUserRole(userId, role, token) {
  const res = await authFetch(
    `${BASE}/api/v1/users/${userId}/role`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    },
    token
  );
  return res.json();
}

export async function updateUserStatus(userId, status, token) {
  const res = await authFetch(
    `${BASE}/api/v1/users/${userId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
    token
  );
  return res.json();
}

// ─── Cars ─────────────────────────────────────────────────────────────────────

export async function getCars(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/api/v1/cars${query ? '?' + query : ''}`);
  return res.json();
}

export async function getMyCars(params = {}, token) {
  const query = new URLSearchParams(params).toString();
  const res = await authFetch(`${BASE}/api/v1/cars/my${query ? '?' + query : ''}`, {}, token);
  return res.json();
}

export async function getCar(id) {
  const res = await fetch(`${BASE}/api/v1/cars/${id}`);
  return res.json();
}

export async function getCarBookedDates(id) {
  const res = await fetch(`${BASE}/api/v1/cars/${id}/booked-dates`);
  return res.json();
}

export async function getCarReviews(carId, params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/api/v1/cars/${carId}/reviews${query ? '?' + query : ''}`);
  return res.json();
}

export async function createCar(formData, token) {
  const res = await authFetch(
    `${BASE}/api/v1/cars`,
    {
      method: "POST",
      body: formData,
    },
    token
  );
  return res.json();
}

export async function updateCar(id, data, token) {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";

  const res = await authFetch(
    `${BASE}/api/v1/cars/${id}`,
    {
      method: "PATCH",
      headers,
      body: isFormData ? data : JSON.stringify(data),
    },
    token
  );
  return res.json();
}

export async function updateCarStatus(id, statusData, token) {
  const res = await authFetch(
    `${BASE}/api/v1/cars/${id}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(statusData),
    },
    token
  );
  return res.json();
}

export async function deleteCar(id, token) {
  const res = await authFetch(`${BASE}/api/v1/cars/${id}`, { method: "DELETE" }, token);
  return res.json();
}

export async function deleteCarPhoto(carId, photoId, token) {
  const res = await authFetch(
    `${BASE}/api/v1/cars/${carId}/photos/${encodeURIComponent(photoId)}`,
    { method: "DELETE" },
    token
  );
  return res.json();
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function quoteBooking({ carId, startDate, endDate }, token) {
  const res = await authFetch(
    `${BASE}/api/v1/bookings/quote`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carId, startDate, endDate }),
    },
    token
  );
  return res.json();
}

export async function createBooking({ carId, startDate, endDate }, token, idempotencyKey = null) {
  const headers = { "Content-Type": "application/json" };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await authFetch(
    `${BASE}/api/v1/bookings`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ carId, startDate, endDate }),
    },
    token
  );
  return res.json();
}

export async function getMyBookings(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await authFetch(`${BASE}/api/v1/bookings/my${qs ? '?' + qs : ''}`, {}, token);
  return res.json();
}

export async function getHostBookings(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await authFetch(`${BASE}/api/v1/bookings/host${qs ? '?' + qs : ''}`, {}, token);
  return res.json();
}

export async function getAllBookings(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await authFetch(`${BASE}/api/v1/bookings${qs ? '?' + qs : ''}`, {}, token);
  return res.json();
}

export async function getBookingById(id, token) {
  const res = await authFetch(`${BASE}/api/v1/bookings/${id}`, {}, token);
  return res.json();
}

export async function cancelBooking(id, reason, token) {
  const res = await authFetch(
    `${BASE}/api/v1/bookings/${id}/cancel`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    },
    token
  );
  return res.json();
}

export async function confirmBookingPickup(id, token) {
  const res = await authFetch(`${BASE}/api/v1/bookings/${id}/confirm`, { method: "PATCH" }, token);
  return res.json();
}

export async function completeBooking(id, returnData, token) {
  const res = await authFetch(
    `${BASE}/api/v1/bookings/${id}/complete`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(returnData || {}),
    },
    token
  );
  return res.json();
}

export async function createBookingReview(bookingId, { rating, comment }, token) {
  const res = await authFetch(
    `${BASE}/api/v1/bookings/${bookingId}/review`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    },
    token
  );
  return res.json();
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function checkoutPayment(param, token, idempotencyKey = null) {
  let bookingId, successUrl, cancelUrl;
  if (typeof param === "object" && param !== null) {
    bookingId = param.bookingId;
    successUrl = param.successUrl;
    cancelUrl = param.cancelUrl;
  } else {
    bookingId = param;
  }

  const headers = { "Content-Type": "application/json" };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await authFetch(
    `${BASE}/api/v1/payments/checkout`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ bookingId, successUrl, cancelUrl }),
    },
    token
  );
  return res.json();
}

export async function getPaymentByBooking(bookingId, token) {
  const res = await authFetch(`${BASE}/api/v1/payments/booking/${bookingId}`, {}, token);
  return res.json();
}

export async function getMyPayments(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await authFetch(`${BASE}/api/v1/payments/my${qs ? '?' + qs : ''}`, {}, token);
  return res.json();
}

export async function getAllPayments(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await authFetch(`${BASE}/api/v1/payments${qs ? '?' + qs : ''}`, {}, token);
  return res.json();
}

export async function getPaymentById(id, token) {
  const res = await authFetch(`${BASE}/api/v1/payments/${id}`, {}, token);
  return res.json();
}

export async function refundPayment(paymentId, data, token) {
  const res = await authFetch(
    `${BASE}/api/v1/payments/${paymentId}/refund`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
    token
  );
  return res.json();
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

export async function getAdminStats(params = {}, token) {
  const qs = new URLSearchParams(params).toString();
  const res = await authFetch(`${BASE}/api/v1/admin/stats${qs ? '?' + qs : ''}`, {}, token);
  return res.json();
}

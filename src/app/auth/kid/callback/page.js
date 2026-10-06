"use client";
/**
 * KID OAuth Callback Page
 * Route: /auth/kid/callback
 *
 * This page is the redirect_uri target registered in your KID dashboard.
 * After the user authenticates on KID, they land here with ?code=...&state=...
 *
 * Flow:
 *  1. Extract `code` and `state` from the URL search params.
 *  2. POST to /api/auth/kid/callback (our server route) which calls KIDAuthServer
 *     to exchange the code for tokens + user data — never exposing client_secret.
 *  3. Persist tokens + user via session helpers.
 *  4. Redirect to /auth/kid/profile.
 *
 * KID docs notes:
 * - `state` MUST be forwarded exactly as received — KID uses it to look up
 *   the server-side PKCE record. Omitting it causes a token exchange failure.
 * - The token response includes `user` directly; no extra /userinfo call needed.
 * - `sub` is the stable identifier to use as a foreign key.
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { session } from "@/lib/kid-auth";

function KIDCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState("exchanging"); // "exchanging" | "success" | "error"
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle KID-side auth errors (e.g. user cancelled)
    if (error) {
      setErrorMessage(errorDescription || error);
      setStatus("error");
      return;
    }

    if (!code) {
      setErrorMessage("No authorization code received from KID.");
      setStatus("error");
      return;
    }

    (async () => {
      try {
        // Exchange code + state via our secure server route.
        // `state` is forwarded so KID can validate the PKCE record server-side.
        const res = await fetch("/api/auth/kid/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, state }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Token exchange failed");
        }

        // Persist tokens and user data (sub is stable FK — see KID docs)
        session.save(data);

        setStatus("success");
        // Navigate to the profile page to display user data + wallet address
        router.push("/auth/kid/profile");
      } catch (err) {
        setErrorMessage(err.message || "An unexpected error occurred.");
        setStatus("error");
      }
    })();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        {status === "exchanging" && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 flex flex-col items-center gap-5">
            {/* Animated KID logo / spinner */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-[#FF385C]/20 border-t-[#FF385C] animate-spin" />
              <div className="absolute inset-3 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2z"
                    fill="#FF385C"
                    fillOpacity="0.15"
                    stroke="#FF385C"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="#FF385C"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Verifying your KID identity…</h1>
              <p className="text-xs text-gray-500 mt-1">Exchanging authorization code for tokens</p>
            </div>
            {/* Step indicators */}
            <div className="flex flex-col gap-2 w-full text-left">
              {[
                "Receiving authorization code",
                "Verifying with KID servers",
                "Loading your profile & wallet",
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="w-4 h-4 rounded-full bg-[#FF385C]/10 border border-[#FF385C]/30 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF385C] animate-pulse" />
                  </div>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✅</div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Identity Verified!</h1>
              <p className="text-xs text-gray-500 mt-1">Redirecting to your profile…</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="bg-white rounded-3xl shadow-xl border border-red-100 p-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-3xl">⚠️</div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Authentication Failed</h1>
              <p className="text-xs text-red-600 mt-1 bg-red-50 px-3 py-2 rounded-lg font-mono">
                {errorMessage}
              </p>
            </div>
            <button
              id="kid-callback-retry-btn"
              onClick={() => router.push("/auth/login")}
              className="mt-2 w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#FF385C] to-[#E00B41] text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function KIDCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
          Loading…
        </div>
      }
    >
      <KIDCallbackContent />
    </Suspense>
  );
}

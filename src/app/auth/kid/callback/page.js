"use client";
/**
 * KID OAuth Callback Page
 * Route: /auth/kid/callback
 *
 * Flow:
 * 1. Extract `code` and `codeVerifier` using `kidClient.extractCallback()`.
 *    (KIDOAuthClient verified state and retrieved code_verifier from sessionStorage).
 * 2. POST { code, codeVerifier } to /api/auth/kid/callback.
 * 3. Store tokens & user and redirect to profile page.
 */

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { kidClient, session } from "@/lib/kid-auth";

function KIDCallbackContent() {
  const router = useRouter();
  const [status, setStatus] = useState("exchanging"); // "exchanging" | "success" | "error"
  const [errorMessage, setErrorMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    // Avoid double execution in React StrictMode (codes & verifiers are single-use)
    if (started.current) return;
    started.current = true;

    async function handleExchange() {
      try {
        // extractCallback validates state against sessionStorage and returns code & codeVerifier
        const { code, codeVerifier } = await kidClient.extractCallback();

        if (!code) {
          throw new Error("No authorization code received from KID.");
        }

        const res = await fetch("/api/auth/kid/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, codeVerifier }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.error || "Token exchange failed");
        }

        // Persist session (user keyed by sub)
        session.save(data);
        setStatus("success");
        router.replace("/");
        // router.replace("/auth/kid/profile");
      } catch (err) {
        console.error("Callback error:", err);
        setErrorMessage(err.message || "An unexpected error occurred.");
        setStatus("error");
      }
    }

    handleExchange();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        {status === "exchanging" && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 flex flex-col items-center gap-5">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin" />
              <div className="absolute inset-3 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2z"
                    fill="currentColor"
                    fillOpacity="0.15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Verifying your KID identity…</h1>
              <p className="text-xs text-gray-500 mt-1">Exchanging authorization code with PKCE (S256)</p>
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
              <p className="text-xs text-red-600 mt-1 bg-red-50 px-3 py-2 rounded-lg font-mono break-words">
                {errorMessage}
              </p>
            </div>
            <button
              id="kid-callback-retry-btn"
              onClick={() => router.push("/auth/login")}
              className="mt-2 w-full py-3 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
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

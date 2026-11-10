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
import { ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        {status === "exchanging" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center gap-4">
            <div className="relative w-14 h-14">
              <div className="absolute inset-0 rounded-full border-3 border-slate-200 border-t-rose-600 animate-spin" />
              <div className="absolute inset-3 flex items-center justify-center">
                <ShieldCheck size={22} strokeWidth={2} className="text-slate-800" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Signing you in…</h1>
              <p className="text-xs text-slate-500 mt-1">Verifying your KOOMPI ID</p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Signed in</h1>
              <p className="text-xs text-slate-500 mt-1">Redirecting…</p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="bg-white rounded-2xl border border-rose-200 p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Sign-in failed</h1>
              <p className="text-xs text-rose-600 mt-1.5 bg-rose-50 px-3 py-2 rounded-lg break-words">
                {errorMessage}
              </p>
            </div>
            <button
              id="kid-callback-retry-btn"
              type="button"
              onClick={() => router.push("/auth/login")}
              className="mt-1 w-full py-2.5 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-blue-600 text-white transition-colors cursor-pointer"
            >
              Back to sign in
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

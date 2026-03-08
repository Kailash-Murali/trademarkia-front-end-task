"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInAnon } = useAuth();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
      </div>
    );
  }

  const handleAnon = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await signInAnon(name.trim());
      router.replace("/");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle();
      router.replace("/");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/unauthorized-domain") {
        setError(
          "This domain is not authorized for Google Sign-In. Please add it to your Firebase project's authorized domains, or sign in as a guest."
        );
      } else {
        setError("Sign-in failed. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">Sheets Lite</h1>
          <p className="mt-1 text-sm text-gray-500">
            Collaborative spreadsheets, stripped to the bones.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnon()}
            placeholder="Enter a display name"
            maxLength={30}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
            disabled={busy}
          />
          <button
            onClick={handleAnon}
            disabled={busy || !name.trim()}
            className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-40"
          >
            Continue as Guest
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
        >
          <LogIn className="h-4 w-4" />
          Sign in with Google
        </button>

        {error && (
          <p className="text-xs text-red-600 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setPasswordWithToken } from "../lib/api/auth";
import Image from "next/image";

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Invalid setup link.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);
      await setPasswordWithToken({ token, newPassword });
      setSuccess("Password set successfully. You can now login.");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to set password. Link may be expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#0d0f14" }}>
      <div className="w-full max-w-md p-8 rounded-lg" style={{ background: "#1a1d25", border: "1px solid #2a2d38" }}>
        <div className="mb-4 flex justify-center">
          <div className="logo-frame logo-frame-animated border border-white/10 bg-black/20">
            <Image src="/logo.jpeg" alt="Set password logo" width={42} height={42} className="logo-img logo-color-animate object-cover" priority />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Set Your Password</h1>
        <p className="text-gray-400 text-sm mb-6 text-center">Use this link to create your account password.</p>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500/50 text-green-400 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded transition-colors"
          >
            {isLoading ? "Saving..." : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen" style={{ background: "#0d0f14" }}>
          <div className="text-gray-300 text-sm">Loading...</div>
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}

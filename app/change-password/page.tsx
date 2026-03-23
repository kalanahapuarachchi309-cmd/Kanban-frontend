"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { changePassword, setPasswordWithToken } from "../lib/api/auth";
import Image from "next/image";

export default function ChangePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const isTokenFlow = token.length > 0;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);
      if (isTokenFlow) {
        await setPasswordWithToken({ token, newPassword });
        setSuccess("Password set successfully. You can now login.");
        setTimeout(() => router.push("/login"), 1000);
        return;
      }

      await changePassword({ currentPassword, newPassword });

      const userRaw = localStorage.getItem("user");
      if (userRaw) {
        try {
          const parsed = JSON.parse(userRaw);
          parsed.mustChangePassword = false;
          localStorage.setItem("user", JSON.stringify(parsed));
        } catch {
        }
      }

      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#0d0f14" }}>
      <div className="w-full max-w-md p-8 rounded-lg" style={{ background: "#1a1d25", border: "1px solid #2a2d38" }}>
        <div className="mb-4 flex justify-center">
          <div className="logo-frame logo-frame-animated border border-white/10 bg-black/20">
            <Image src="/logo-2.png" alt="Change password logo" width={42} height={42} className="logo-img logo-color-animate object-contain" priority />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Change Password</h1>
        <p className="text-gray-400 text-sm mb-6 text-center">
          {isTokenFlow
            ? "Use this secure link to set your password."
            : "You must set a new password before continuing."}
        </p>

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
          {!isTokenFlow && (
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

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
            {isLoading ? "Saving..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "../lib/api/auth";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Change Password</h1>
        <p className="text-gray-400 text-sm mb-6 text-center">You must set a new password before continuing.</p>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
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

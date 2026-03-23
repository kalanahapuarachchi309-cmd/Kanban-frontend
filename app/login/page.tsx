"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth-context";
import { useRouter } from "next/navigation";
import { resendPasswordSetupLink } from "../lib/api/auth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsLoading(true);

    try {
      await login({ username, password });
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendSetupEmail = async () => {
    setError("");
    setInfo("");

    const identifier = username.trim();
    if (!identifier) {
      setError("Enter your username or email first.");
      return;
    }

    try {
      setIsResending(true);
      await resendPasswordSetupLink({ usernameOrEmail: identifier });
      setInfo("Password setup email sent. Please check your inbox.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resend password setup email.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#0d0f14" }}>
      <div className="w-full max-w-md p-8 rounded-lg" style={{ background: "#1a1d25", border: "1px solid #2a2d38" }}>
        <h1 className="text-3xl font-bold text-white mb-6 text-center">Kanban Board</h1>
        <h2 className="text-xl text-gray-300 mb-6 text-center">Sign In</h2>
        
        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500/50 text-green-400 text-sm">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Username or Email
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter your username or email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded transition-colors"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResendSetupEmail}
          disabled={isResending}
          className="mt-3 w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 text-white font-medium rounded transition-colors"
        >
          {isResending ? "Sending..." : "Resend Password Setup Email"}
        </button>

        {/* <p className="mt-4 text-center text-sm text-gray-500">
          Default credentials: admin / admin123
        </p> */}
      </div>
    </div>
  );
}

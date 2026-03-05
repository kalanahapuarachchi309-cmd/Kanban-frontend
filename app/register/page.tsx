"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { register } from "../lib/api/auth";

type Role = "QA_PM" | "DEVELOPER" | "CLIENT";

interface RoleOption {
  value: Role;
  label: string;
  description: string;
  color: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "QA_PM",
    label: "QA / Project Manager",
    description: "Manage projects, review work items, and coordinate team",
    color: "#f59e0b",
  },
  {
    value: "DEVELOPER",
    label: "Developer",
    description: "Work on assigned tasks and submit code",
    color: "#6366f1",
  },
  {
    value: "CLIENT",
    label: "Client",
    description: "View published work and provide feedback",
    color: "#22c55e",
  },
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    temporaryPassword: "",
    confirmPassword: "",
    role: "DEVELOPER" as Role,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.temporaryPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.temporaryPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      await register({
        username: formData.username,
        email: formData.email,
        temporaryPassword: formData.temporaryPassword,
        role: formData.role,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0d0f14" }}>
        <div className="w-full max-w-md p-8 rounded-lg text-center" style={{ background: "#1a1d25", border: "1px solid #2a2d38" }}>
          <div className="mb-4 text-green-500 text-5xl">✓</div>
          <h2 className="text-2xl font-bold text-white mb-4">Registration Successful!</h2>
          <p className="text-gray-300 mb-6">
            Your account has been created. You will be redirected to the login page...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4" style={{ background: "#0d0f14" }}>
      <div className="w-full max-w-4xl p-6 rounded-lg" style={{ background: "#1a1d25", border: "1px solid #2a2d38" }}>
        <h1 className="text-2xl font-bold text-white mb-1 text-center">Create Account</h1>
        <p className="text-gray-400 text-center mb-4 text-sm">Join the Kanban Board</p>

        {error && (
          <div className="mb-3 p-2.5 rounded bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Username and Email in one row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-gray-300 mb-1.5">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-300 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`relative flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    formData.role === option.value
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-gray-700 bg-[#0d0f14] hover:border-gray-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={formData.role === option.value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="flex items-center mb-1">
                    <div
                      className="w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0"
                      style={{ backgroundColor: option.color }}
                    />
                    <span className="font-semibold text-white text-xs">{option.label}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 leading-tight">{option.description}</span>
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-gray-500">
              Note: ADMIN role can only be assigned by existing administrators
            </p>
          </div>

          {/* Password and Confirm Password in one row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="temporaryPassword" className="block text-xs font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input
                id="temporaryPassword"
                name="temporaryPassword"
                type="password"
                value={formData.temporaryPassword}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Min 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-300 mb-1.5">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded bg-[#0d0f14] border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Confirm password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium rounded transition-colors mt-4"
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-500 hover:text-blue-400 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

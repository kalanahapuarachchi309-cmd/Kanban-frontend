import { apiClient } from "./config";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  role: string;
  mustChangePassword: boolean;
}

export interface CurrentUserResponse {
  id: number;
  username: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  isActive: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  temporaryPassword: string;
  role: "ADMIN" | "QA_PM" | "DEVELOPER" | "CLIENT";
}

export interface RegisterResponse {
  id: number;
  username: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  isActive: boolean;
}

export interface SetPasswordWithTokenRequest {
  token: string;
  newPassword: string;
}

export interface ResendPasswordSetupRequest {
  usernameOrEmail: string;
}

/**
 * Login user
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/api/auth/login", credentials);
  
  // Store token and user info
  if (response.data.token) {
    localStorage.setItem("jwt_token", response.data.token);

    try {
      const meResponse = await apiClient.get<CurrentUserResponse>("/api/users/me");
      localStorage.setItem("user", JSON.stringify(meResponse.data));
    } catch {
      const fallbackUser: CurrentUserResponse = {
        id: 0,
        username: response.data.username,
        email: "",
        role: response.data.role,
        mustChangePassword: response.data.mustChangePassword,
        isActive: true,
      };
      localStorage.setItem("user", JSON.stringify(fallbackUser));
    }
  }
  
  return response.data;
}

/**
 * Logout user
 */
export function logout(): void {
  localStorage.removeItem("jwt_token");
  localStorage.removeItem("user");
}

/**
 * Get current user from local storage
 */
export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  
  const userStr = localStorage.getItem("user");
  if (!userStr || userStr === "undefined" || userStr === "null") return null;

  try {
    const parsed = JSON.parse(userStr);
    if (!parsed || typeof parsed !== "object") {
      localStorage.removeItem("user");
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("jwt_token");
}

/**
 * Change password
 */
export async function changePassword(request: ChangePasswordRequest): Promise<void> {
  await apiClient.post("/api/auth/change-password", request);
}

/**
 * Register new user (public registration - no ADMIN role)
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>("/api/users/register", data);
  return response.data;
}

export async function setPasswordWithToken(request: SetPasswordWithTokenRequest): Promise<void> {
  await apiClient.post("/api/auth/password-setup", request);
}

export async function resendMyPasswordSetupEmail(): Promise<void> {
  await apiClient.post("/api/users/me/resend-password-setup");
}

export async function resendPasswordSetupLink(request: ResendPasswordSetupRequest): Promise<void> {
  await apiClient.post("/api/auth/password-setup/resend", request);
}

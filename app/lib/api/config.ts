import axios from "axios";

// Base API URL from environment variable
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9080";
const APP_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("jwt_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("user");
      // Redirect to login if needed
      if (typeof window !== "undefined") {
        window.location.href = `${APP_BASE_PATH}/login`;
      }
    }
    return Promise.reject(error);
  }
);

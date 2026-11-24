import axios from "axios";
import { getToken, clearSession } from "./auth";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:9000"
).replace(/\/$/, "");

const IMAGE_BASE_URL = (
  import.meta.env.VITE_IMAGE_BASE_URL || API_BASE_URL
).replace(/\/$/, "");

const normalizePath = (path) => (path.startsWith("/") ? path : `/${path}`);

export const getApiUrl = (path) => `${API_BASE_URL}${normalizePath(path)}`;

export const getImageUrl = (fileName) =>
  fileName ? `${IMAGE_BASE_URL}/img/${fileName}` : "";

// Use this client for every backend call. It attaches the login token, and
// every reply has the same { code, message, data } shape, so components check
// `response.data.code` whether the request worked or not.
export const api = axios.create({
  baseURL: API_BASE_URL,
  // Error statuses (400, 401, 409, ...) resolve instead of throwing; the
  // backend's message is in response.data.message either way.
  validateStatus: () => true,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    // A token was sent and rejected: it expired or the account is gone.
    // Drop the stale session and send the user to log in again.
    if (response.status === 401 && response.config.headers?.Authorization) {
      clearSession();
      window.location.assign("/login");
    }
    return response;
  },
  // No reply at all (server down, network error): return the same shape so
  // callers show a message instead of crashing.
  () => ({
    data: {
      code: 0,
      message: "Could not reach the server. Please try again.",
      data: null,
    },
  })
);

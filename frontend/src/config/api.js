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

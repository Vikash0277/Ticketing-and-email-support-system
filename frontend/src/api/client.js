import axios from "axios";

const RAW_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

export const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "";
  }
})();

export const AUTH_STORAGE_KEY = "authSession";

export function readSession() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);
    if (!session?.user || typeof session.user !== "object") return null;

    return session;
  } catch {
    return null;
  }
}

function writeSession(session) {
  if (typeof window === "undefined") return;

  try {
    if (session?.user) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in private browsing; ignore.
  }
}

function emit(name, detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
});

client.interceptors.request.use((config) => {
  const session = readSession();

  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

let refreshPromise = null;

async function refreshTokens() {
  const session = readSession();

  if (!session?.refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
    refreshToken: session.refreshToken,
  });

  const auth = response.data?.data ?? response.data;

  if (!auth?.accessToken) {
    throw new Error("Unable to refresh the session");
  }

  const nextSession = {
    user: auth.user ?? session.user,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken ?? session.refreshToken,
  };

  writeSession(nextSession);
  emit("auth:refreshed", nextSession);

  return nextSession;
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isAuthRequest =
      typeof original?.url === "string" &&
      (original.url.includes("/auth/login") ||
        original.url.includes("/auth/register") ||
        original.url.includes("/auth/refresh") ||
        original.url.includes("/auth/verify") ||
        original.url.includes("/auth/forgot") ||
        original.url.includes("/auth/reset"));

    if (status === 401 && original && !original._retry && !isAuthRequest) {
      original._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = refreshTokens().finally(() => {
            refreshPromise = null;
          });
        }

        const session = await refreshPromise;

        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${session.accessToken}`;

        return client(original);
      } catch {
        writeSession(null);
        emit("auth:expired");
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error, fallback = "Something went wrong") {
  if (!error) return fallback;

  if (typeof error === "string") return error;

  const response = error.response?.data;

  if (response?.errors?.length) {
    const details = response.errors
      .map((item) => item.message)
      .filter(Boolean)
      .join(". ");

    if (details) return details;
  }

  return response?.message || error.message || fallback;
}

export function getFieldErrors(error) {
  const errors = error?.response?.data?.errors;
  const result = {};

  if (Array.isArray(errors)) {
    for (const item of errors) {
      if (item?.field) result[item.field] = item.message;
    }
  }

  return result;
}

export function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response;
}

export function unwrapPage(response) {
  return {
    items: response?.data?.data ?? [],
    pagination: response?.data?.pagination ?? null,
    message: response?.data?.message ?? "",
  };
}

export function absoluteFileUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function downloadFile(url, filename) {
  if (!url) return;

  if (/^https?:\/\//i.test(url)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  const response = await client.get(url, { responseType: "blob" });
  const objectUrl = window.URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename || "attachment";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export { writeSession };
export default client;

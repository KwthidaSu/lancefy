import axios from "axios";
import qs from "qs";
import keycloak from "@/lib/keycloak";

export const authHttp = axios.create({
  baseURL: "/api",
  paramsSerializer: {
    serialize: (params) =>
      qs.stringify(params, { arrayFormat: "repeat" }),
  },
});

// ── Request interceptor: refresh token before every request ──
authHttp.interceptors.request.use(async (config) => {
  if (!keycloak.authenticated) {
    return config;
  }

  try {
    // Refresh if token expires within next 60 seconds
    await keycloak.updateToken(60);
    if (keycloak.token) {
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
  } catch {
    // Refresh token also expired → force re-login
    console.warn("Session expired. Redirecting to login...");
    keycloak.login({ redirectUri: window.location.href });
  }

  return config;
});

// ── Response interceptor: handle 401 from server ──
authHttp.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && keycloak.authenticated) {
      try {
        // Force refresh (minValidity = -1 always refreshes)
        await keycloak.updateToken(-1);
        if (keycloak.token) {
          error.config.headers.Authorization = `Bearer ${keycloak.token}`;
          return authHttp.request(error.config);
        }
      } catch {
        // Still failing → back to login
        keycloak.login({ redirectUri: window.location.href });
      }
    }
    return Promise.reject(error);
  }
);

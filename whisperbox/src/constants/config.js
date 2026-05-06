export const BASE_URL = "https://whisperbox.koyeb.app";

export const ENDPOINTS = {
  REGISTER:   "/auth/register",
  LOGIN:      "/auth/login",
  ME:         "/users/me",
  USERS:      "/users",
  PUBLIC_KEY: "/users/me/key",
  MESSAGES:   "/messages",
  THREAD:     (uid) => `/messages/${uid}`,
};

export const POLL_INTERVAL_MS = 5000;

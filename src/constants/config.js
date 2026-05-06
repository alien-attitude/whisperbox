export const BASE_URL = "https://whisperbox.koyeb.app";

export const ENDPOINTS = {
  // ── Auth ───────────────────────────────────────────────
  REGISTER: "/auth/register",
  LOGIN:    "/auth/login",
  ME:       "/auth/me",
  REFRESH:  "/auth/refresh",
  LOGOUT:   "/auth/logout",

  // ── Users ──────────────────────────────────────────────
  USER_SEARCH:     (query)  => `/users/search?q=${encodeURIComponent(query)}`,
  USER_PUBLIC_KEY: (userId) => `/users/${userId}/public-key`,

  // ── Conversations & Messages ───────────────────────────
  CONVERSATIONS:         "/conversations",
  CONVERSATION_MESSAGES: (userId) => `/conversations/${userId}/messages`,
  MESSAGES:              "/messages",

  // ── WebSocket ──────────────────────────────────────────
  WS: (token) => `wss://whisperbox.koyeb.app/ws?token=${encodeURIComponent(token)}`,
};

/** How often (ms) to fall back to HTTP polling if WebSocket is unavailable */
export const POLL_INTERVAL_MS = 5000;

/** Access token lifetime — refresh 1 min before the 15-min expiry */
export const TOKEN_EXPIRY_MS        = 15 * 60 * 1000;
export const TOKEN_REFRESH_BUFFER_MS =  1 * 60 * 1000;

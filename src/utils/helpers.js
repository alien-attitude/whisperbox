/** ArrayBuffer/TypedArray -> base64 string */
export const toB64 = (input) => {
  const bytes =
      input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer ?? input);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

/** Accepts base64 OR base64url, with or without '=' padding */
export const normalizeB64 = (b64 = "") => {
  let s = String(b64 ?? "").trim();

  // Strip common wrappers
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }

  // Handle data URLs like: data:application/octet-stream;base64,AAAA...
  const commaIdx = s.indexOf(",");
  if (s.startsWith("data:") && commaIdx !== -1) {
    s = s.slice(commaIdx + 1).trim();
  }

  // Remove whitespace/newlines and convert URL-safe alphabet
  s = s.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");

  const padLen = (4 - (s.length % 4)) % 4;
  return s + "=".repeat(padLen);
};

/** base64/base64url string -> ArrayBuffer */
export const fromB64 = (b64) => {
  const normalized = normalizeB64(b64);
  const bin = atob(normalized);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out.buffer;
};

/**
 * Format an ISO timestamp for display.
 * Shows time-only if today, date otherwise.
 */
export const fmtTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

/**
 * Derive a consistent hue from a username string (for avatar colors).
 */
export const usernameHue = (name = "") =>
    [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
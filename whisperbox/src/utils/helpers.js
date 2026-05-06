/** ArrayBuffer → base64 string */
export const toB64 = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)));

/** base64 string → ArrayBuffer */
export const fromB64 = (b64) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;

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

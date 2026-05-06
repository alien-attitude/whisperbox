import { BASE_URL, ENDPOINTS as EP } from "../constants/config";

/**
 * API
 * ───
 * REST client for the WhisperBox backend.
 * Never sends or receives plaintext message content — only encrypted blobs.
 */
const API = {
  async _req(path, opts = {}, token = null) {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    };
    const res  = await fetch(BASE_URL + path, { ...opts, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || data.message || `HTTP ${res.status}`);
    return data;
  },

  // ── Auth ──────────────────────────────────────────────────

  async register(username, password) {
    return this._req(EP.REGISTER, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  async login(username, password) {
    // WhisperBox uses OAuth2PasswordRequestForm → form-encoded body
    const res = await fetch(BASE_URL + EP.LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || data.message || "Login failed");
    return data; // { access_token, token_type }
  },

  // ── Users ─────────────────────────────────────────────────

  async getMe(token) {
    return this._req(EP.ME, {}, token);
  },

  async getUsers(token) {
    const data = await this._req(EP.USERS, {}, token);
    return Array.isArray(data) ? data : (data.users || data.data || []);
  },

  /**
   * Upload the user's public key to the server.
   * Tries multiple endpoint patterns to handle API variations.
   * The private key is NEVER included — only the base64 SPKI public key.
   */
  async uploadPublicKey(token, publicKeyB64) {
    const body = JSON.stringify({ public_key: publicKeyB64 });
    const attempts = [
      () => this._req(EP.PUBLIC_KEY, { method: "PUT",   body }, token),
      () => this._req(EP.ME,         { method: "PATCH", body }, token),
      () => this._req(EP.ME,         { method: "PUT",   body }, token),
    ];
    for (const attempt of attempts) {
      try { return await attempt(); } catch { /* try next */ }
    }
    throw new Error("Could not upload public key — check API endpoint configuration");
  },

  // ── Messages ──────────────────────────────────────────────

  /**
   * Send an encrypted message blob to a recipient.
   * `encrypted` = { ciphertext, encrypted_key, iv } — all base64.
   * The server stores this blob and routes it; it cannot decrypt it.
   */
  async sendMessage(token, recipientId, encrypted) {
    return this._req(EP.MESSAGES, {
      method: "POST",
      body: JSON.stringify({ recipient_id: recipientId, ...encrypted }),
    }, token);
  },

  /**
   * Fetch the message thread with a specific user.
   * Falls back to filtering the full inbox if per-thread endpoint fails.
   */
  async getThread(token, userId) {
    try {
      const data = await this._req(EP.THREAD(userId), {}, token);
      return Array.isArray(data) ? data : (data.messages || data.data || []);
    } catch {
      const all = await this._req(EP.MESSAGES, {}, token);
      const arr = Array.isArray(all) ? all : (all.messages || all.data || []);
      return arr.filter(
        (m) => String(m.sender_id) === String(userId) || String(m.recipient_id) === String(userId)
      );
    }
  },
};

export default API;

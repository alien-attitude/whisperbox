import { BASE_URL, ENDPOINTS as EP } from "../constants/config";

/**
 * API
 * ───
 * REST client for the WhisperBox backend.
 * All message methods transmit only encrypted blobs — never plaintext.
 */
const API = {
  // ── Internal request helper ───────────────────────────────────────────────

  async _req(path, opts = {}, token = null) {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    };
    const res  = await fetch(BASE_URL + path, { ...opts, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // FastAPI validation errors arrive as detail: [{loc, msg, type}, ...]
      const detail = data.detail;
      let message;
      if (Array.isArray(detail)) {
        message = detail
          .map((e) => {
            const field = Array.isArray(e.loc)
              ? e.loc.filter(Boolean).join(" → ")
              : "";
            return field ? `${field}: ${e.msg}` : e.msg;
          })
          .join("\n");
      } else {
        message = detail || data.message || `HTTP ${res.status}`;
      }
      throw new Error(message);
    }
    return data;
  },

  // ── Auth ──────────────────────────────────────────────────────────────────

  /**
   * Register a new user.
   * All crypto material is generated on the client BEFORE this call.
   * The server stores blobs it can never decrypt.
   *
   * @param {{
   *   username, display_name, password,
   *   public_key, wrapped_private_key, pbkdf2_salt
   * }} payload
   */
  async register(payload) {
    return this._req(EP.REGISTER, {
      method: "POST",
      body:   JSON.stringify(payload),
    });
  },

  /**
   * Login with username + password (JSON body, not form-encoded).
   * Response includes wrapped_private_key + pbkdf2_salt needed to
   * recover the private key on this or any new device.
   */
  async login(username, password) {
    return this._req(EP.LOGIN, {
      method: "POST",
      body:   JSON.stringify({ username, password }),
    });
  },

  /** Get the current user's full profile including key material. */
  async getMe(token) {
    return this._req(EP.ME, {}, token);
  },

  /**
   * Refresh the access token using the stored refresh token.
   * Call this ~1 min before the 15-min access token expires.
   */
  async refresh(refreshToken) {
    return this._req(EP.REFRESH, {
      method: "POST",
      body:   JSON.stringify({ refresh_token: refreshToken }),
    });
  },

  /** Revoke the refresh token. Access token expires naturally. */
  async logout(token, refreshToken) {
    return this._req(EP.LOGOUT, {
      method: "POST",
      body:   JSON.stringify({ refresh_token: refreshToken }),
    }, token);
  },

  // ── Users ─────────────────────────────────────────────────────────────────

  /**
   * Search users by username or display name.
   * Returns up to 20 results, excluding the current user.
   * Results shape: [{ id, username, display_name }]  — no public_key here.
   */
  async searchUsers(token, query) {
    if (!query || !query.trim()) return [];
    const data = await this._req(EP.USER_SEARCH(query.trim()), {}, token);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Fetch a specific user's RSA-OAEP public key.
   * Always call this immediately before encrypting a message —
   * never rely on a cached value from search results.
   */
  async getUserPublicKey(token, userId) {
    const data = await this._req(EP.USER_PUBLIC_KEY(userId), {}, token);
    return data.public_key; // base64 SPKI string
  },

  // ── Conversations ─────────────────────────────────────────────────────────

  /**
   * List all conversations, sorted by most recent message first.
   * Shape: [{ user_id, display_name, username, last_message_at }]
   */
  async getConversations(token) {
    const data = await this._req(EP.CONVERSATIONS, {}, token);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Get paginated message history with a specific user.
   * Messages are returned newest-first.
   * Shape: [{ id, from_user_id, to_user_id, payload: { ciphertext, iv, encryptedKey, encryptedKeyForSelf }, delivered, created_at }]
   *
   * @param {string} before - ISO-8601 cursor for pagination (optional)
   */
  async getConversationMessages(token, userId, { limit = 50, before } = {}) {
    const params = new URLSearchParams({ limit });
    if (before) params.set("before", before);
    const data = await this._req(
      `${EP.CONVERSATION_MESSAGES(userId)}?${params}`,
      {},
      token
    );
    return Array.isArray(data) ? data : [];
  },

  // ── Messages ──────────────────────────────────────────────────────────────

  /**
   * Send an encrypted message via HTTP (offline fallback — prefer WebSocket).
   * The payload contains only ciphertext blobs; the server cannot decrypt them.
   *
   * @param {string} to  - recipient UUID
   * @param {{ ciphertext, iv, encryptedKey, encryptedKeyForSelf }} payload
   */
  async sendMessage(token, to, payload) {
    return this._req(EP.MESSAGES, {
      method: "POST",
      body:   JSON.stringify({ to, payload }),
    }, token);
  },
};

export default API;

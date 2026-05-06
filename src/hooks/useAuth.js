import { useState, useRef, useCallback } from "react";
import API from "../services/api";
import CryptoService from "../services/crypto";
import { toB64 } from "../utils/helpers";
import { TOKEN_EXPIRY_MS, TOKEN_REFRESH_BUFFER_MS } from "../constants/config";

/**
 * useAuth
 * ───────
 * Manages the full authentication lifecycle:
 *  - Register  → generates keys client-side first, sends blobs to server
 *  - Login     → retrieves wrapped key material from server response
 *  - Refresh   → silently renews access token before 15-min expiry
 *  - Logout    → revokes refresh token on server, clears local state
 *
 * auth state shape:
 * {
 *   token:            string,          // current access token
 *   refreshToken:     string,
 *   me: {
 *     id, username, display_name,
 *     public_key,                      // base64 SPKI — used for encryptedKeyForSelf
 *     wrapped_private_key,             // base64 AES-KW blob — for key recovery
 *     pbkdf2_salt,                     // base64 — for key recovery
 *   },
 *   password:         string,          // kept in memory ONLY for key unwrapping; never persisted
 * }
 */
export function useAuth() {
  const [auth,    setAuth]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const refreshTimerRef       = useRef(null);

  const clearError = () => setError("");

  // ── Token refresh ─────────────────────────────────────────────────────────

  const scheduleRefresh = useCallback((refreshToken, delayMs) => {
    clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const data = await API.refresh(refreshToken);
        setAuth((prev) =>
          prev ? { ...prev, token: data.access_token } : prev
        );
        // Schedule the next refresh
        scheduleRefresh(refreshToken, TOKEN_EXPIRY_MS - TOKEN_REFRESH_BUFFER_MS);
      } catch {
        // Token expired or revoked — force re-login
        setAuth(null);
      }
    }, delayMs);
  }, []);

  // ── Session builder ───────────────────────────────────────────────────────

  const buildSession = useCallback((data, password) => {
    const session = {
      token:        data.access_token,
      refreshToken: data.refresh_token,
      me:           data.user,
      password,                         // kept only for key unwrapping
    };
    setAuth(session);

    // Schedule silent token refresh ~1 min before expiry
    const expiresIn = (data.expires_in ?? 900) * 1000;
    scheduleRefresh(data.refresh_token, expiresIn - TOKEN_REFRESH_BUFFER_MS);
    return session;
  }, [scheduleRefresh]);

  // ── Register ──────────────────────────────────────────────────────────────

  /**
   * Full registration flow:
   *  1. Generate RSA key pair
   *  2. Wrap private key with PBKDF2 → AES-KW
   *  3. POST all blobs to /auth/register
   *  4. Return session + keyPair (for useKeys to cache locally)
   */
  const register = useCallback(async (username, displayName, password) => {
    setLoading(true);
    setError("");
    try {
      // Generate keys before hitting the network
      const keyPair  = await CryptoService.generateKeyPair();
      const salt     = CryptoService.generateSalt();
      const wrapKey  = await CryptoService.deriveWrappingKey(password, salt);
      const wrapped  = await CryptoService.wrapPrivateKey(keyPair.privateKey, wrapKey);
      const pubB64   = await CryptoService.exportPublicKey(keyPair.publicKey);

      const data = await API.register({
        username:            username.trim(),
        display_name:        displayName.trim() || username.trim(),
        password,
        public_key:          pubB64,
        wrapped_private_key: wrapped,
        pbkdf2_salt:         toB64(salt.buffer),
      });

      const session = buildSession(data, password);
      return { session, keyPair };
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [buildSession]);

  // ── Login ─────────────────────────────────────────────────────────────────

  /**
   * Login — gets back wrapped_private_key + pbkdf2_salt from server,
   * which useKeys will use to recover the private key.
   */
  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError("");
    try {
      const data    = await API.login(username.trim(), password);
      const session = buildSession(data, password);
      return session;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [buildSession]);

  // ── Logout ────────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    clearTimeout(refreshTimerRef.current);
    if (auth?.token && auth?.refreshToken) {
      try {
        await API.logout(auth.token, auth.refreshToken);
      } catch { /* ignore — clear locally regardless */ }
    }
    setAuth(null);
  }, [auth]);

  return { auth, loading, error, clearError, login, register, logout };
}

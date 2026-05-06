import { useState } from "react";
import API from "../services/api";

/**
 * useAuth
 * ───────
 * Manages authentication state: login, register, and the resulting
 * session object ({ token, me }).
 *
 * `auth` is kept in-memory only — no token is written to localStorage.
 * Refreshing the page will require re-login (a deliberate trade-off
 * that keeps the session ephemeral and avoids localStorage exposure).
 */
export function useAuth() {
  const [auth,    setAuth]    = useState(null);  // { token: string, me: { id, username } }
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const clearError = () => setError("");

  const login = async (username, password) => {
    setLoading(true);
    setError("");
    try {
      const loginData = await API.login(username.trim(), password);
      const token = loginData.access_token;

      let me;
      try {
        me = await API.getMe(token);
      } catch {
        // Some backends don't expose /users/me separately — use login response
        me = {
          id:       loginData.user_id || loginData.id || username,
          username: loginData.username || username.trim(),
        };
      }

      const session = {
        token,
        me: { id: String(me.id || me.user_id || username), username: me.username || username.trim() },
      };
      setAuth(session);
      return session;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password) => {
    setLoading(true);
    setError("");
    try {
      await API.register(username.trim(), password);
      // Immediately log in after registering
      return await login(username, password);
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => setAuth(null);

  return { auth, loading, error, clearError, login, register, logout };
}

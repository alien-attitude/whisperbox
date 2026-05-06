import { useRef, useCallback, useEffect } from "react";
import { ENDPOINTS } from "../constants/config";

/**
 * useWebSocket
 * ────────────
 * Manages the real-time WebSocket connection to WhisperBox.
 * Handles connect, reconnect, send, and all server → client events.
 *
 * Events the server emits:
 *   message.receive  — a new encrypted message blob arrived
 *   user.online      — a contact came online
 *   user.offline     — a contact went offline
 *   error            — server rejected a frame
 *
 * @param {string}   token           - current access token
 * @param {Function} onMessage       - called with a message.receive event object
 * @param {Function} onPresenceChange- called with { user_id, online: bool }
 */
export function useWebSocket(token, onMessage, onPresenceChange) {
  const wsRef          = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(1000);   // starts at 1s, backs off to 30s
  const mountedRef     = useRef(true);

  const connect = useCallback(() => {
    if (!token || !mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(ENDPOINTS.WS(token));
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectDelay.current = 1000; // reset backoff on success
      };

      ws.onmessage = (evt) => {
        let frame;
        try { frame = JSON.parse(evt.data); } catch { return; }

        switch (frame.event) {
          case "message.receive":
            onMessage?.(frame);
            break;
          case "user.online":
            onPresenceChange?.({ user_id: frame.user_id, online: true });
            break;
          case "user.offline":
            onPresenceChange?.({ user_id: frame.user_id, online: false });
            break;
          case "error":
            console.warn("WS server error:", frame.detail);
            break;
          default:
            break;
        }
      };

      ws.onerror = (e) => console.warn("WebSocket error:", e);

      ws.onclose = () => {
        if (!mountedRef.current) return;
        // Exponential back-off: 1s → 2s → 4s … capped at 30s
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30_000);
          connect();
        }, reconnectDelay.current);
      };
    } catch (e) {
      console.warn("WebSocket connect failed:", e);
    }
  }, [token, onMessage, onPresenceChange]);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  /**
   * Send an encrypted message frame over the WebSocket.
   * Falls back gracefully — caller should use API.sendMessage() if this fails.
   *
   * @param {string} to      - recipient UUID
   * @param {{ ciphertext, iv, encryptedKey, encryptedKeyForSelf }} payload
   * @returns {boolean} true if sent via WS, false if WS unavailable
   */
  const sendFrame = useCallback((to, payload) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return false;
    wsRef.current.send(JSON.stringify({ event: "message.send", to, payload }));
    return true;
  }, []);

  // Connect on mount / token change; disconnect on unmount
  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return { sendFrame, connect, disconnect };
}

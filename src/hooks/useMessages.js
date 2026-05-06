import { useState, useCallback, useRef, useEffect } from "react";
import API           from "../services/api";
import CryptoService from "../services/crypto";
import { useWebSocket } from "./useWebSocket";
import { POLL_INTERVAL_MS } from "../constants/config";

/**
 * useMessages
 * ───────────
 * Manages encrypted message threads.
 *
 * Decryption logic:
 *   Incoming (from_user_id !== me) → decrypt payload.encryptedKey with our private key
 *   Sent     (from_user_id === me) → decrypt payload.encryptedKeyForSelf with our private key
 *
 * Delivery:
 *   Primary   → WebSocket (real-time, via useWebSocket)
 *   Fallback  → POST /messages + poll if WebSocket unavailable
 */
export function useMessages(auth, keys) {
  const [threads,       setThreads]       = useState({});  // { [userId]: [processedMsg] }
  const [conversations, setConversations] = useState([]);  // sidebar list
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending,       setSending]       = useState(false);
  const [sendError,     setSendError]     = useState("");
  const pollRef = useRef(null);

  // ── Decrypt a single raw message ─────────────────────────────────────────

  const decryptMsg = useCallback(async (msg) => {
    const isSent = String(msg.from_user_id) === String(auth?.me?.id);
    try {
      const plaintext = await CryptoService.decryptMessage(
        msg.payload,
        keys.priv,
        isSent
      );
      return { ...msg, _isSent: isSent, _plaintext: plaintext };
    } catch {
      return {
        ...msg,
        _isSent: isSent,
        _error: isSent
          ? "Cannot decrypt (encryptedKeyForSelf missing or corrupted)"
          : "Decryption failed — key mismatch?",
      };
    }
  }, [auth, keys]);

  // ── Fetch + decrypt a thread ──────────────────────────────────────────────

  const fetchThread = useCallback(async (userId) => {
    if (!auth || !keys) return;
    try {
      setLoadingThread(true);
      // API returns newest-first; reverse to show oldest-first in UI
      const msgs = await API.getConversationMessages(auth.token, userId);
      const sorted = [...msgs].reverse();

      const processed = await Promise.all(
        sorted.map(async (msg) => {
          // Re-use cached decryption result
          const cached = threads[userId]?.find((m) => m.id === msg.id);
          if (cached?._plaintext !== undefined || cached?._error) return cached;
          return decryptMsg(msg);
        })
      );

      setThreads((prev) => ({ ...prev, [userId]: processed }));
    } catch (e) {
      console.error("fetchThread:", e);
    } finally {
      setLoadingThread(false);
    }
  }, [auth, keys, threads, decryptMsg]);

  // ── Load conversations sidebar ────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    if (!auth) return;
    try {
      const list = await API.getConversations(auth.token);
      setConversations(list);
    } catch (e) {
      console.error("loadConversations:", e);
    }
  }, [auth]);

  // ── WebSocket incoming message handler ───────────────────────────────────

  const handleIncomingWS = useCallback(async (frame) => {
    // frame shape: { event, id, from_user_id, to_user_id, payload, created_at }
    const threadKey = String(frame.from_user_id) === String(auth?.me?.id)
      ? frame.to_user_id
      : frame.from_user_id;

    const processed = await decryptMsg(frame);

    setThreads((prev) => {
      const existing = prev[threadKey] || [];
      // Avoid duplicates
      if (existing.some((m) => m.id === processed.id)) return prev;
      return { ...prev, [threadKey]: [...existing, processed] };
    });

    // Bubble up to conversations list (update last_message_at)
    setConversations((prev) => {
      const exists = prev.find((c) => c.user_id === threadKey);
      if (exists) {
        return prev
          .map((c) => c.user_id === threadKey ? { ...c, last_message_at: frame.created_at } : c)
          .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
      }
      return prev; // new conversation — reload sidebar
    });
  }, [auth, decryptMsg]);

  const handlePresence = useCallback(({ user_id, online }) => {
    setConversations((prev) =>
      prev.map((c) => c.user_id === user_id ? { ...c, _online: online } : c)
    );
  }, []);

  const { sendFrame } = useWebSocket(
    auth?.token ?? null,
    handleIncomingWS,
    handlePresence
  );

  // ── Polling fallback ──────────────────────────────────────────────────────

  const startPolling = useCallback((userId) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchThread(userId), POLL_INTERVAL_MS);
  }, [fetchThread]);

  const stopPolling = useCallback(() => clearInterval(pollRef.current), []);

  useEffect(() => () => clearInterval(pollRef.current), []);

  // ── Send a message ────────────────────────────────────────────────────────

  /**
   * Encrypts and sends a message to a recipient.
   *   1. Fetch recipient's public key from server (always fresh — never cached).
   *   2. Encrypt with recipient key (encryptedKey) and own key (encryptedKeyForSelf).
   *   3. Send via WebSocket if available, else POST /messages.
   *   4. Optimistic UI update.
   */
  const sendMessage = useCallback(async (plaintext, recipient) => {
    if (!plaintext.trim() || sending || !keys) return false;
    setSending(true);
    setSendError("");

    try {
      // Always fetch fresh public key — never trust a cached/search result
      const recipientPubKeyB64 = await API.getUserPublicKey(auth.token, recipient.id);
      const recipientPubKey    = await CryptoService.importPublicKey(recipientPubKeyB64);

      // keys.pub is our own public key (stored as CryptoKey)
      const encrypted = await CryptoService.encryptMessage(
        plaintext.trim(),
        recipientPubKey,
        keys.pub
      );

      let sentMsg;
      const sent = sendFrame(recipient.id, encrypted);

      if (!sent) {
        // WebSocket unavailable — fall back to HTTP
        sentMsg = await API.sendMessage(auth.token, recipient.id, encrypted);
      }

      // Optimistic update — inject plaintext immediately so sender sees it
      const optimistic = {
        id:           sentMsg?.id || `tmp-${Date.now()}`,
        from_user_id: auth.me.id,
        to_user_id:   recipient.id,
        payload:      encrypted,
        created_at:   sentMsg?.created_at || new Date().toISOString(),
        delivered:    !!sentMsg,
        _isSent:      true,
        _plaintext:   plaintext.trim(),
      };

      setThreads((prev) => ({
        ...prev,
        [recipient.id]: [...(prev[recipient.id] || []), optimistic],
      }));

      return true;
    } catch (e) {
      setSendError(e.message);
      return false;
    } finally {
      setSending(false);
    }
  }, [auth, keys, sending, sendFrame]);

  const clearSendError = () => setSendError("");

  return {
    threads,
    conversations,
    loadingThread,
    sending,
    sendError,
    clearSendError,
    fetchThread,
    startPolling,
    stopPolling,
    loadConversations,
    sendMessage,
  };
}

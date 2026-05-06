import { useState, useCallback, useRef, useEffect } from "react";
import API           from "../services/api";
import CryptoService from "../services/crypto";
import { POLL_INTERVAL_MS } from "../constants/config";

/**
 * useMessages
 * ───────────
 * Manages encrypted message threads:
 *  - Fetches raw ciphertext blobs from the server
 *  - Decrypts incoming messages using the local private key
 *  - Encrypts and sends outgoing messages using the recipient's public key
 *  - Polls the active thread every POLL_INTERVAL_MS milliseconds
 *
 * Sent messages are shown with their plaintext immediately (optimistic update)
 * because we cannot decrypt them later — the message was encrypted to the
 * recipient's public key, not ours.
 */
export function useMessages(auth, keys) {
  const [threads,     setThreads]     = useState({});  // { [userId]: [processedMsg] }
  const [loadingThread, setLoadingThread] = useState(false);
  const [sendError,   setSendError]   = useState("");
  const [sending,     setSending]     = useState(false);
  const pollRef = useRef(null);

  // ── Fetch + decrypt a thread ──────────────────────────────
  const fetchThread = useCallback(async (userId) => {
    if (!auth || !keys) return;
    try {
      setLoadingThread(true);
      const msgs = await API.getThread(auth.token, userId);
      msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      const processed = await Promise.all(
        msgs.map(async (msg) => {
          const isSent = String(msg.sender_id) === String(auth.me.id);

          // Re-use already-decrypted result from cache
          const cached = threads[userId]?.find((m) => m.id === msg.id);
          if (cached?._plaintext !== undefined || cached?._error) return cached;

          if (isSent) {
            // We encrypted to recipient's public key — can't decrypt our own sent msg.
            // Plaintext is injected via optimistic update in sendMessage().
            return { ...msg, _isSent: true };
          }

          try {
            const plaintext = await CryptoService.decryptMessage(
              { ciphertext: msg.ciphertext, encrypted_key: msg.encrypted_key, iv: msg.iv },
              keys.priv
            );
            return { ...msg, _isSent: false, _plaintext: plaintext };
          } catch {
            return { ...msg, _isSent: false, _error: "Decryption failed — key mismatch?" };
          }
        })
      );

      setThreads((prev) => ({ ...prev, [userId]: processed }));
    } catch (e) {
      console.error("fetchThread:", e);
    } finally {
      setLoadingThread(false);
    }
  }, [auth, keys, threads]);

  // ── Start / stop polling ──────────────────────────────────
  const startPolling = useCallback((userId) => {
    clearInterval(pollRef.current);
    fetchThread(userId);
    pollRef.current = setInterval(() => fetchThread(userId), POLL_INTERVAL_MS);
  }, [fetchThread]);

  const stopPolling = useCallback(() => {
    clearInterval(pollRef.current);
  }, []);

  useEffect(() => () => clearInterval(pollRef.current), []);

  // ── Send a message ────────────────────────────────────────
  const sendMessage = useCallback(async (plaintext, recipient, users) => {
    if (!plaintext.trim() || sending) return false;
    setSending(true);
    setSendError("");

    try {
      const recipientUser = users.find((u) => String(u.id) === String(recipient.id));
      if (!recipientUser?.public_key)
        throw new Error(`${recipient.username} has no registered public key. They need to log in first.`);

      const recipientPubKey = await CryptoService.importPublicKey(recipientUser.public_key);
      const encrypted       = await CryptoService.encryptMessage(plaintext.trim(), recipientPubKey);
      const sent            = await API.sendMessage(auth.token, recipient.id, encrypted);

      // Optimistic update — show our own message with plaintext immediately
      setThreads((prev) => ({
        ...prev,
        [recipient.id]: [
          ...(prev[recipient.id] || []),
          {
            ...sent,
            id:         sent.id || `tmp-${Date.now()}`,
            sender_id:  auth.me.id,
            created_at: sent.created_at || new Date().toISOString(),
            _isSent:    true,
            _plaintext: plaintext.trim(),
          },
        ],
      }));

      return true;
    } catch (e) {
      setSendError(e.message);
      return false;
    } finally {
      setSending(false);
    }
  }, [auth, sending]);

  const clearSendError = () => setSendError("");

  return {
    threads,
    loadingThread,
    sending,
    sendError,
    clearSendError,
    fetchThread,
    startPolling,
    stopPolling,
    sendMessage,
  };
}

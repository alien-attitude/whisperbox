import { useState, useCallback } from "react";
import CryptoService from "../services/crypto";
import KeyStore      from "../services/keystore";
import API           from "../services/api";

/**
 * useKeys
 * ───────
 * Manages the user's RSA-OAEP key pair lifecycle:
 *  1. On first login on a device → generate, upload public key, store private key.
 *  2. On subsequent logins → load existing keys from IndexedDB.
 *
 * The private key is a non-extractable CryptoKey stored in IndexedDB.
 * It never leaves the browser, is never serialised to a string, and
 * cannot be read even by JavaScript running on the same page.
 */
export function useKeys() {
  const [keys,    setKeys]    = useState(null);   // { priv: CryptoKey, pub: CryptoKey }
  const [status,  setStatus]  = useState("");
  const [error,   setError]   = useState(false);
  const [ready,   setReady]   = useState(false);

  const setup = useCallback(async (userId, token) => {
    setError(false);
    setReady(false);

    try {
      setStatus("Checking this device for existing keys…");
      const stored = await KeyStore.load(userId);

      if (stored) {
        setStatus("Restoring your encryption keys…");
        setKeys(stored);
        setReady(true);
        return stored;
      }

      setStatus("Generating RSA-2048 key pair…");
      const keyPair = await CryptoService.generateKeyPair();

      setStatus("Uploading public key to server…");
      const pubB64 = await CryptoService.exportPublicKey(keyPair.publicKey);
      await API.uploadPublicKey(token, pubB64);

      setStatus("Securing private key in browser storage…");
      const entry = { priv: keyPair.privateKey, pub: keyPair.publicKey };
      await KeyStore.save(userId, entry);

      setKeys(entry);
      setReady(true);
      return entry;
    } catch (e) {
      console.error("Key setup error:", e);
      setStatus(e.message || "Key setup failed");
      setError(true);
      return null;
    }
  }, []);

  return { keys, status, error, ready, setup };
}

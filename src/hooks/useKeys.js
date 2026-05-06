import { useState, useCallback } from "react";
import CryptoService from "../services/crypto";
import KeyStore      from "../services/keystore";
import { fromB64 }   from "../utils/helpers";

/**
 * useKeys
 * ───────
 * Manages the RSA key pair lifecycle.
 *
 * Recovery priority:
 *  1. IndexedDB cache (same device/browser) — instant, no crypto work
 *  2. Server blob (wrapped_private_key + pbkdf2_salt) + password → unwrap
 *
 * `keys` shape: { priv: CryptoKey, pub: CryptoKey }
 */
export function useKeys() {
  const [keys,   setKeys]   = useState(null);
  const [status, setStatus] = useState("");
  const [error,  setError]  = useState(false);
  const [ready,  setReady]  = useState(false);

  /**
   * Restore keys after login.
   *
   * @param {string} userId
   * @param {{ wrapped_private_key, pbkdf2_salt, public_key }} serverUser - from auth.me
   * @param {string} password - transient, only used if IndexedDB miss
   */
  const setup = useCallback(async (userId, serverUser, password) => {
    setError(false);
    setReady(false);

    try {
      // 1. IndexedDB cache
      setStatus("Checking this device for cached keys…");
      const cached = await KeyStore.load(userId);
      if (cached) {
        setStatus("Restored keys from local cache.");
        setKeys(cached);
        setReady(true);
        return cached;
      }

      // 2. Recover from server blob
      setStatus("Recovering private key from server backup…");
      const { wrapped_private_key, pbkdf2_salt, public_key } = serverUser;

      if (!wrapped_private_key || !pbkdf2_salt || !public_key) {
        throw new Error("Server did not return complete key material. Please log in again.");
      }

      // Decode the salt — fromB64 handles standard and URL-safe base64
      let saltBytes;
      try {
        saltBytes = new Uint8Array(fromB64(pbkdf2_salt));
      } catch (e) {
        throw new Error(`Could not decode pbkdf2_salt from server: ${e.message}`);
      }

      // unwrapPrivateKey now accepts password + saltBytes directly,
      // so it can re-derive the correct key type (AES-GCM or AES-KW) internally.
      setStatus("Decrypting private key…");
      const privateKey = await CryptoService.unwrapPrivateKey(
        wrapped_private_key,
        password,
        saltBytes
      );

      // Import public key for encryption use
      const publicKey = await CryptoService.importPublicKey(public_key);
      const entry = { priv: privateKey, pub: publicKey };

      // Cache for instant restore on next login on this device
      setStatus("Caching keys on this device…");
      await KeyStore.save(userId, entry);

      setKeys(entry);
      setReady(true);
      return entry;
    } catch (e) {
      console.error("Key setup error:", e);
      setStatus(e.message || "Key recovery failed.");
      setError(true);
      return null;
    }
  }, []);

  /**
   * Cache a freshly generated key pair after registration.
   * useAuth generates the pair; we just store it locally.
   *
   * @param {string}   userId
   * @param {{ privateKey, publicKey }} keyPair - from CryptoService.generateKeyPair()
   */
  const cacheNewKeyPair = useCallback(async (userId, keyPair) => {
    setError(false);
    try {
      setStatus("Caching new key pair on this device…");
      // Re-import the public key so it's in the correct CryptoKey form
      const pubB64   = await CryptoService.exportPublicKey(keyPair.publicKey);
      const publicKey = await CryptoService.importPublicKey(pubB64);
      const entry = { priv: keyPair.privateKey, pub: publicKey };
      await KeyStore.save(userId, entry);
      setKeys(entry);
      setReady(true);
      return entry;
    } catch (e) {
      console.error("Key cache error:", e);
      setStatus(e.message);
      setError(true);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setKeys(null);
    setReady(false);
    setError(false);
    setStatus("");
  }, []);

  return { keys, status, error, ready, setup, cacheNewKeyPair, reset };
}

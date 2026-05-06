import { toB64, fromB64 } from "../utils/helpers";

/**
 * CryptoService
 * ─────────────
 * All cryptographic operations via the browser's native Web Crypto API.
 * Zero third-party crypto libraries.
 *
 * Private-key backup scheme:
 *   PBKDF2 (200k iter, SHA-256) → AES-256-GCM → encrypts exported PKCS#8 bytes
 *   Output: base64( JSON { v:1, alg:"AES-GCM", iv:<b64>, data:<b64> } )
 *   AES-GCM is used instead of AES-KW because AES-KW requires input to be
 *   a multiple of 8 bytes, which PKCS#8 RSA keys are not guaranteed to satisfy.
 *
 * Message encryption scheme:
 *   RSA-OAEP 2048-bit  → wraps the per-message AES-GCM key
 *   AES-256-GCM        → encrypts the plaintext (fresh key + IV per message)
 *   encryptedKey       → AES key wrapped with recipient RSA public key
 *   encryptedKeyForSelf→ AES key wrapped with sender's own RSA public key
 */
const CryptoService = {

  // ── Key generation ──────────────────────────────────────────────────────

  async generateKeyPair() {
    return window.crypto.subtle.generateKey(
      {
        name:           "RSA-OAEP",
        modulusLength:  2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash:           "SHA-256",
      },
      true,               // extractable so we can export for backup
      ["encrypt", "decrypt"]
    );
  },

  generateSalt() {
    return window.crypto.getRandomValues(new Uint8Array(16));
  },

  // ── Public key import / export ──────────────────────────────────────────

  /**
   * Export a public key to a base64-encoded SPKI string for server upload.
   * THIS WAS MISSING — it is called by useAuth (register) and useKeys (cacheNewKeyPair).
   */
  async exportPublicKey(publicKey) {
    const buf = await window.crypto.subtle.exportKey("spki", publicKey);
    return toB64(buf);
  },

  /**
   * Import a base64-encoded SPKI public key for encryption.
   */
  async importPublicKey(b64spki) {
    return window.crypto.subtle.importKey(
      "spki",
      fromB64(b64spki),
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );
  },

  // ── Private-key wrapping (PBKDF2 → AES-GCM) ────────────────────────────

  /**
   * Derive an AES-256-GCM key from password + salt via PBKDF2.
   * Used to encrypt/decrypt the private key blob for server-side backup.
   */
  async deriveWrappingKey(password, salt) {
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 200_000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  /**
   * Encrypt (wrap) the RSA private key for server-side backup.
   *
   * Output format: base64( JSON { v:1, alg:"AES-GCM", iv:<b64>, data:<b64> } )
   * The JSON is UTF-8 encoded then base64'd so the server receives a plain string.
   */
  async wrapPrivateKey(privateKey, wrappingKey) {
    const pkcs8      = await window.crypto.subtle.exportKey("pkcs8", privateKey);
    const iv         = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted  = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      wrappingKey,
      pkcs8
    );
    const envelope = { v: 1, alg: "AES-GCM", iv: toB64(iv), data: toB64(encrypted) };
    return toB64(new TextEncoder().encode(JSON.stringify(envelope)));
  },

  /**
   * Decrypt (unwrap) the RSA private key from the server-stored blob.
   *
   * Accepts password + saltBytes directly so it can re-derive the correct key
   * internally. This prevents the previous bug where a pre-derived key with
   * AES-GCM encrypt/decrypt permissions was passed to the AES-KW legacy path,
   * causing a misleading DOMException.
   *
   * @param {string}     wrappedB64 - base64 blob from server (wrapped_private_key)
   * @param {string}     password   - user's plaintext password (transient)
   * @param {Uint8Array} saltBytes  - decoded pbkdf2_salt from server
   * @returns {CryptoKey} non-extractable RSA-OAEP private key
   */
  async unwrapPrivateKey(wrappedB64, password, saltBytes) {
    // ── Try current AES-GCM JSON-envelope format ──
    try {
      const jsonBytes = fromB64(wrappedB64);
      const parsed    = JSON.parse(new TextDecoder().decode(jsonBytes));

      if (parsed?.alg === "AES-GCM" && parsed?.iv && parsed?.data) {
        const wrappingKey = await this.deriveWrappingKey(password, saltBytes);
        const pkcs8 = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv: new Uint8Array(fromB64(parsed.iv)) },
          wrappingKey,
          fromB64(parsed.data)
        );
        return window.crypto.subtle.importKey(
          "pkcs8",
          pkcs8,
          { name: "RSA-OAEP", hash: "SHA-256" },
          false,
          ["decrypt"]
        );
      }
    } catch {
      // Not our JSON envelope format — try legacy AES-KW
    }

    // ── Legacy AES-KW fallback ──
    // Re-derive with wrapKey/unwrapKey permissions (different from AES-GCM key above).
    // This handles accounts created before the AES-GCM format was adopted.
    try {
      const kwMaterial = await window.crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
      );
      const kwKey = await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: saltBytes, iterations: 200_000, hash: "SHA-256" },
        kwMaterial,
        { name: "AES-KW", length: 256 },
        false,
        ["unwrapKey"]
      );
      return window.crypto.subtle.unwrapKey(
        "pkcs8",
        fromB64(wrappedB64),
        kwKey,
        "AES-KW",
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["decrypt"]
      );
    } catch (e) {
      throw new Error(
        "Private key decryption failed. The password may be wrong, or the key was saved with an incompatible version. Error: " +
        e.message
      );
    }
  },

  // ── Message encryption ──────────────────────────────────────────────────

  /**
   * Encrypt a plaintext message for a recipient.
   * Produces encryptedKeyForSelf so the sender can read their own sent messages.
   */
  async encryptMessage(plaintext, recipientPublicKey, senderPublicKey) {
    const aesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt"]
    );
    const iv           = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuf = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      new TextEncoder().encode(plaintext)
    );
    const rawAes = await window.crypto.subtle.exportKey("raw", aesKey);

    const [encryptedKeyBuf, encryptedKeyForSelfBuf] = await Promise.all([
      window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, recipientPublicKey, rawAes),
      window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, senderPublicKey,    rawAes),
    ]);

    return {
      ciphertext:          toB64(ciphertextBuf),
      iv:                  toB64(iv),
      encryptedKey:        toB64(encryptedKeyBuf),
      encryptedKeyForSelf: toB64(encryptedKeyForSelfBuf),
    };
  },

  // ── Message decryption ──────────────────────────────────────────────────

  /**
   * Decrypt a message payload using the caller's RSA private key.
   * @param {boolean} isSent - true → use encryptedKeyForSelf; false → encryptedKey
   */
  async decryptMessage(payload, privateKey, isSent = false) {
    const wrappedKey = isSent ? payload.encryptedKeyForSelf : payload.encryptedKey;
    if (!wrappedKey) throw new Error("Missing encrypted key in payload");

    const rawAes = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      fromB64(wrappedKey)
    );
    const aesKey = await window.crypto.subtle.importKey(
      "raw", rawAes, { name: "AES-GCM" }, false, ["decrypt"]
    );
    const plaintextBuf = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(fromB64(payload.iv)) },
      aesKey,
      fromB64(payload.ciphertext)
    );
    return new TextDecoder().decode(plaintextBuf);
  },
};

export default CryptoService;

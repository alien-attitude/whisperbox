import { toB64, fromB64 } from "../utils/helpers";

/**
 * CryptoService
 * ─────────────
 * All cryptographic operations use the browser's native Web Crypto API.
 * No third-party crypto libraries are used.
 *
 * Encryption scheme:
 *   - RSA-OAEP 2048-bit  → key encapsulation (wraps the AES key)
 *   - AES-256-GCM        → message encryption (fresh key per message)
 *   - 96-bit random IV   → GCM nonce (random per message)
 */
const CryptoService = {
  /**
   * Generate a non-extractable RSA-OAEP key pair.
   * The private key's `extractable: false` flag is the core security
   * guarantee — raw key bytes can never be read out, even by JS.
   */
  async generateKeyPair() {
    return window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      false,             // private key: NON-EXTRACTABLE
      ["encrypt", "decrypt"]
    );
  },

  /** Export a public key to base64-encoded SPKI (for upload to server). */
  async exportPublicKey(publicKey) {
    const buf = await window.crypto.subtle.exportKey("spki", publicKey);
    return toB64(buf);
  },

  /** Import a recipient's base64-encoded SPKI public key for encryption. */
  async importPublicKey(b64spki) {
    return window.crypto.subtle.importKey(
      "spki",
      fromB64(b64spki),
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );
  },

  /**
   * Encrypt a plaintext string for a recipient.
   *
   * Steps:
   *  1. Generate a fresh ephemeral AES-256-GCM key (one per message).
   *  2. Generate a random 96-bit IV.
   *  3. Encrypt the plaintext with AES-GCM.
   *  4. Export the raw AES key and wrap it with the recipient's RSA-OAEP public key.
   *  5. Return { ciphertext, encrypted_key, iv } — all base64.
   *
   * The server receives only the ciphertext blob and can never decrypt it.
   */
  async encryptMessage(plaintext, recipientPublicKey) {
    const aesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt"]
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuf = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      new TextEncoder().encode(plaintext)
    );

    const rawAes = await window.crypto.subtle.exportKey("raw", aesKey);
    const encryptedKeyBuf = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      recipientPublicKey,
      rawAes
    );

    return {
      ciphertext:    toB64(ciphertextBuf),
      encrypted_key: toB64(encryptedKeyBuf),
      iv:            toB64(iv),
    };
  },

  /**
   * Decrypt a message blob using our own private key.
   *
   * Steps:
   *  1. Unwrap the AES key using our RSA-OAEP private key.
   *  2. Import the recovered raw AES key.
   *  3. Decrypt the ciphertext with AES-GCM.
   *  4. Return the plaintext string.
   *
   * Throws if keys don't match or ciphertext has been tampered with.
   */
  async decryptMessage({ ciphertext, encrypted_key, iv }, privateKey) {
    const rawAes = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      fromB64(encrypted_key)
    );

    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      rawAes,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    const plaintextBuf = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(fromB64(iv)) },
      aesKey,
      fromB64(ciphertext)
    );

    return new TextDecoder().decode(plaintextBuf);
  },
};

export default CryptoService;

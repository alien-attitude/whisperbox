/**
 * KeyStore
 * ────────
 * Caches CryptoKey objects in IndexedDB using the structured clone algorithm.
 * This allows non-extractable keys to persist across page refreshes without
 * ever serialising their raw bytes — the browser handles key storage natively.
 *
 * This is a local device cache only. The canonical encrypted copy lives on the
 * server as wrapped_private_key + pbkdf2_salt (recoverable via the user's password).
 */
const KeyStore = {
  _dbPromise: null,

  _db() {
    if (!this._dbPromise) {
      this._dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open("wb-keystore-v2", 1);
        req.onupgradeneeded = (e) =>
          e.target.result.createObjectStore("keys");
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror   = ()  => reject(req.error);
      });
    }
    return this._dbPromise;
  },

  /**
   * Cache a { priv, pub } CryptoKey pair for a given user ID.
   * priv is a non-extractable CryptoKey — IndexedDB stores the key object,
   * not the raw bytes.
   */
  async save(userId, keyPair) {
    const db = await this._db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("keys", "readwrite");
      tx.objectStore("keys").put(
        { priv: keyPair.priv, pub: keyPair.pub },
        String(userId)
      );
      tx.oncomplete = resolve;
      tx.onerror    = () => reject(tx.error);
    });
  },

  /** Load the cached { priv, pub } pair, or null if not present. */
  async load(userId) {
    const db = await this._db();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction("keys", "readonly");
      const req = tx.objectStore("keys").get(String(userId));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => reject(req.error);
    });
  },

  /** Remove cached keys (e.g. after logout or key rotation). */
  async remove(userId) {
    const db = await this._db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("keys", "readwrite");
      tx.objectStore("keys").delete(String(userId));
      tx.oncomplete = resolve;
      tx.onerror    = () => reject(tx.error);
    });
  },
};

export default KeyStore;

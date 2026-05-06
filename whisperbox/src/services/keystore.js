/**
 * KeyStore
 * ────────
 * Persists CryptoKey objects in IndexedDB using the browser's
 * structured clone algorithm. This is the only correct way to store
 * non-extractable CryptoKey objects between sessions — unlike
 * localStorage, IndexedDB can store native key objects without
 * serialising them to bytes (which would defeat non-extractability).
 *
 * The private key's `extractable: false` flag is preserved across
 * storage and retrieval — the raw key bytes are never accessible.
 */
const KeyStore = {
  _dbPromise: null,

  _db() {
    if (!this._dbPromise) {
      this._dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open("wb-keystore-v1", 1);
        req.onupgradeneeded = (e) =>
          e.target.result.createObjectStore("keys");
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror   = ()  => reject(req.error);
      });
    }
    return this._dbPromise;
  },

  /** Persist a { priv, pub } CryptoKey pair for a given user ID. */
  async save(userId, keyPair) {
    const db = await this._db();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("keys", "readwrite");
      tx.objectStore("keys").put(
        { priv: keyPair.privateKey, pub: keyPair.publicKey },
        String(userId)
      );
      tx.oncomplete = resolve;
      tx.onerror    = () => reject(tx.error);
    });
  },

  /** Load the stored { priv, pub } CryptoKey pair, or null if not found. */
  async load(userId) {
    const db = await this._db();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction("keys", "readonly");
      const req = tx.objectStore("keys").get(String(userId));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => reject(req.error);
    });
  },

  /** Remove stored keys for a user (e.g., on explicit logout + key reset). */
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

# WhisperBox 🔒

A production-grade **End-to-End Encrypted (E2EE)** messaging application built with React and the browser-native [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API). The server stores and routes only ciphertext — it never sees plaintext, private keys, or AES session keys.

---

## Live Demo

```
https://your-deployment-url.vercel.app
```

---

## Quick Start

```bash
git clone https://github.com/your-org/whisperbox.git
cd whisperbox
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # production bundle → dist/
npm run preview    # preview the production build locally
```

**Requirements:** Node 18+, a modern browser (Chrome 84+, Firefox 86+, Safari 15+). No crypto libraries — only the browser's built-in `window.crypto.subtle`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│                                                                 │
│  ┌──────────────┐   ┌─────────────────┐   ┌─────────────────┐  │
│  │  AuthScreen  │   │    useAuth.js   │   │  useKeys.js     │  │
│  │  (register / │──▶│  register/login │──▶│  key generation │  │
│  │   login UI)  │   │  token refresh  │   │  key recovery   │  │
│  └──────────────┘   └────────┬────────┘   └────────┬────────┘  │
│                              │                     │            │
│  ┌──────────────┐   ┌────────▼────────┐   ┌────────▼────────┐  │
│  │   Chat UI    │   │ useMessages.js  │   │  crypto.js      │  │
│  │  (Sidebar,   │◀──│ encrypt / send  │──▶│  RSA-OAEP       │  │
│  │  MessageList,│   │ fetch / decrypt │   │  AES-256-GCM    │  │
│  │  ComposeBar) │   │ WebSocket + HTTP│   │  PBKDF2 + AES   │  │
│  └──────────────┘   └────────┬────────┘   └─────────────────┘  │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │   keystore.js     │                        │
│                    │   IndexedDB cache │                        │
│                    │   (CryptoKey obj) │                        │
│                    └───────────────────┘                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS / WSS
               ┌───────────────▼──────────────┐
               │      WhisperBox Server        │
               │  https://whisperbox.koyeb.app │
               │                               │
               │  ✓ Stores public keys         │
               │  ✓ Stores wrapped_private_key │
               │  ✓ Stores ciphertext blobs    │
               │  ✓ Routes messages            │
               │  ✓ Issues JWT tokens          │
               │                               │
               │  ✗ NEVER sees:                │
               │     plaintext messages        │
               │     raw private keys          │
               │     AES session keys          │
               └───────────────────────────────┘
```

---

## Project Structure

```
whisperbox/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── App.jsx                          # Root — wires all hooks + components
    ├── main.jsx                         # React entry point
    │
    ├── constants/
    │   └── config.js                    # Base URL, all API endpoints, token config
    │
    ├── services/
    │   ├── crypto.js                    # ALL Web Crypto API operations
    │   ├── api.js                       # REST client (never sends plaintext)
    │   └── keystore.js                  # IndexedDB abstraction for CryptoKey storage
    │
    ├── hooks/
    │   ├── useAuth.js                   # Login, register, token refresh, logout
    │   ├── useKeys.js                   # Key generation, recovery, IndexedDB caching
    │   ├── useMessages.js               # Encrypt/send/fetch/decrypt, polling
    │   └── useWebSocket.js              # WS connection, reconnect, presence events
    │
    ├── components/
    │   ├── auth/
    │   │   └── AuthScreen.jsx           # Login + register form (display_name field)
    │   ├── setup/
    │   │   └── KeySetup.jsx             # Key generation/recovery loading overlay
    │   ├── sidebar/
    │   │   ├── Sidebar.jsx              # Conversations list + debounced user search
    │   │   └── ContactItem.jsx          # Single conversation/search-result row
    │   ├── chat/
    │   │   ├── ChatHeader.jsx           # Active conversation header + E2EE badge
    │   │   ├── MessageList.jsx          # Scrollable message thread
    │   │   ├── MessageBubble.jsx        # Single message (sent / received / error)
    │   │   ├── ComposeBar.jsx           # Message input + send button
    │   │   └── EmptyState.jsx           # No conversation selected screen
    │   └── common/
    │       ├── Avatar.jsx               # Deterministic-colour avatar + Spinner
    │       └── Icons.jsx                # Inline SVG icons (no icon font dependency)
    │
    ├── styles/
    │   └── tokens.js                    # Design tokens (colours) + global CSS string
    │
    └── utils/
        └── helpers.js                   # toB64, fromB64, normalizeB64, fmtTime
```

---

## Encryption Flow

### Registration

```
Browser
  │
  ├─ 1. generateKeyPair()
  │       RSA-OAEP 2048-bit, extractable: true
  │
  ├─ 2. generateSalt()
  │       16 random bytes (128-bit PBKDF2 salt)
  │
  ├─ 3. deriveWrappingKey(password, salt)
  │       PBKDF2 → SHA-256, 200 000 iterations → AES-256-GCM key
  │
  ├─ 4. wrapPrivateKey(privateKey, wrappingKey)
  │       export privateKey as PKCS#8
  │       encrypt with AES-GCM + random 96-bit IV
  │       output: base64( JSON { v, alg, iv, data } )
  │
  ├─ 5. exportPublicKey(publicKey) → base64 SPKI
  │
  └─ 6. POST /auth/register
          { username, display_name, password,
            public_key, wrapped_private_key, pbkdf2_salt }
          ↑ server stores blobs verbatim and cannot decrypt them
```

### Login / Key Recovery

```
Browser
  │
  ├─ 1. POST /auth/login → { access_token, refresh_token, user: { wrapped_private_key, pbkdf2_salt, public_key } }
  │
  ├─ 2. Check IndexedDB
  │       Hit  → restore CryptoKey objects, done ✓
  │       Miss → continue to step 3
  │
  ├─ 3. fromB64(pbkdf2_salt) → saltBytes
  │
  ├─ 4. unwrapPrivateKey(wrapped_private_key, password, saltBytes)
  │       Detects format (JSON-envelope AES-GCM or legacy AES-KW)
  │       Re-derives wrapping key from password + salt
  │       Decrypts PKCS#8 bytes
  │       importKey("pkcs8", ..., extractable: false) → CryptoKey
  │
  ├─ 5. importPublicKey(public_key) → CryptoKey
  │
  └─ 6. KeyStore.save(userId, { priv, pub }) → IndexedDB cache
```

### Sending a Message

```
Browser
  │
  ├─ 1. GET /users/{recipientId}/public-key   ← always fetched fresh
  │
  ├─ 2. generateKey(AES-GCM, 256)             ← fresh ephemeral key per message
  │
  ├─ 3. encrypt(AES-GCM, iv, aesKey, plaintext) → ciphertext
  │
  ├─ 4. encrypt(RSA-OAEP, recipientPublicKey, rawAes) → encryptedKey
  │
  ├─ 5. encrypt(RSA-OAEP, ownPublicKey, rawAes)       → encryptedKeyForSelf
  │       (lets the sender decrypt their own sent messages from history)
  │
  └─ 6. WS frame message.send  { to, payload: { ciphertext, iv, encryptedKey, encryptedKeyForSelf } }
         or POST /messages as HTTP fallback
```

### Receiving a Message

```
Browser
  │
  ├─ 1. WS event message.receive  (or poll GET /conversations/{id}/messages)
  │
  ├─ 2. isSent = (from_user_id === myId)
  │       isSent → use payload.encryptedKeyForSelf
  │       else   → use payload.encryptedKey
  │
  ├─ 3. decrypt(RSA-OAEP, privateKey, encryptedKey) → rawAes
  │
  ├─ 4. importKey("raw", rawAes, AES-GCM) → aesKey
  │
  └─ 5. decrypt(AES-GCM, iv, aesKey, ciphertext) → plaintext
```

---

## Key Management

| Key | Where stored | Format | Extractable |
|-----|-------------|--------|-------------|
| RSA public key | Server database | base64 SPKI | Yes — designed to be shared |
| RSA private key (backup) | Server database | base64 JSON-wrapped AES-GCM blob | No — server cannot decrypt |
| RSA private key (live) | Browser IndexedDB | Native `CryptoKey` object | No — `extractable: false` |
| AES-GCM session key | Memory only | `CryptoKey` (ephemeral, per message) | Yes — needed briefly to export raw bytes |
| PBKDF2 salt | Server database | base64 | Yes — public, meaningless without password |

**Why IndexedDB and not localStorage?**
IndexedDB stores native `CryptoKey` objects via the structured clone algorithm. A key marked `extractable: false` can be stored and retrieved without ever exposing raw bytes — even to JavaScript running on the same page. `localStorage` can only store strings, so you'd have to serialise the key (which defeats non-extractability entirely).

**Why AES-GCM for key backup instead of AES-KW?**
AES-KW requires its plaintext input to be a multiple of 8 bytes. RSA-2048 PKCS#8 exports are not guaranteed to satisfy this, causing an unpredictable `DOMException` on some browsers. AES-GCM has no such constraint and provides authenticated encryption with the same 256-bit security level.

---

## API Endpoints Used

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/auth/register` | Create account + upload key blobs |
| `POST` | `/auth/login` | Authenticate + retrieve key material |
| `GET`  | `/auth/me` | Current user profile |
| `POST` | `/auth/refresh` | Silent token renewal |
| `POST` | `/auth/logout` | Revoke refresh token |
| `GET`  | `/users/search?q=` | Find users to message |
| `GET`  | `/users/{id}/public-key` | Fetch recipient's public key before encrypting |
| `GET`  | `/conversations` | List all conversations (sidebar) |
| `GET`  | `/conversations/{id}/messages` | Paginated message history |
| `POST` | `/messages` | Send message (HTTP fallback) |
| `WS`   | `/ws?token=` | Real-time messaging + presence events |

---

## Security Trade-offs

### What this app does well

- **Non-extractable private key in memory** — after `unwrapKey`, the live CryptoKey is `extractable: false`; raw bytes can never be read by JavaScript
- **Authenticated encryption** — AES-GCM provides both confidentiality and integrity; a tampered ciphertext fails decryption with a clear error, never silently corrupts
- **Fresh AES key per message** — limits blast radius if one key is ever recovered to a single message
- **encryptedKeyForSelf** — sender can decrypt their own history; no plaintext copy needed
- **No sensitive data in localStorage** — all key material lives in IndexedDB as native CryptoKey objects or server-side as encrypted blobs
- **Silent token refresh** — access token is renewed 1 minute before its 15-minute expiry without user interaction
- **WebSocket-first, HTTP fallback** — real-time delivery with graceful degradation

### Known Limitations

| Limitation | Detail | Mitigation path |
|-----------|--------|-----------------|
| No forward secrecy | A single long-lived RSA key pair is used per user — if the private key were ever recovered, past ciphertexts could be decrypted | Replace with X3DH + Double Ratchet (Signal Protocol) |
| No multi-device sync for sent messages | `encryptedKeyForSelf` lets you decrypt sent messages you sent from _this_ device; a message sent from another device uses a different key pair | Double-wrap for each registered device |
| No key fingerprint verification | Users cannot verify they have the correct public key (TOFU). A server-side MITM could substitute a key | Display key fingerprints; add out-of-band comparison |
| Password change doesn't rotate keys | Re-encrypting `wrapped_private_key` with a new wrapping key requires a dedicated change-password flow | Implement `/auth/change-password` + re-wrap |
| No message deletion | Encrypted blobs persist indefinitely on the server | Implement ephemeral/disappearing messages |
| IndexedDB is not OS-protected | Browser same-origin policy protects it, but not a device PIN or OS keychain | Offer an additional user-passphrase lock over the cached key |
| No replay attack protection | Message IDs exist server-side but the client doesn't enforce ordering or reject duplicates | Add client-side seen-ID set + server nonce window |

---

## Environment & Deployment

No environment variables are required — the API base URL is hardcoded in `src/constants/config.js`.

```bash
# Build for production
npm run build

# Deploy dist/ to any static host:
# Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc.
```

**HTTPS is required** — `window.crypto.subtle` is only available in [secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts). `localhost` counts as secure for development.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI framework | React 18 |
| Build tool | Vite 5 |
| Encryption | Web Crypto API (browser-native, zero libraries) |
| Key storage | IndexedDB (via `keystore.js`) |
| Real-time | WebSocket (`useWebSocket.js`) |
| Styling | Inline styles + CSS-in-JS (zero CSS frameworks) |
| Fonts | IBM Plex Sans + IBM Plex Mono (Google Fonts) |
| Icons | Inline SVG (zero icon libraries) |

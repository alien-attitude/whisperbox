import { C } from "../../styles/tokens";
import { LockIcon, AlertIcon } from "../common/Icons";
import { Spinner } from "../common/Avatar";
import { fmtTime } from "../../utils/helpers";

/**
 * MessageBubble
 * ─────────────
 * Renders a single message in a thread.
 *
 * A message can be in one of four states:
 *  - Sent (our own)         → shows plaintext (from optimistic update)
 *  - Received + decrypted   → shows plaintext
 *  - Received + decrypting  → shows spinner
 *  - Decryption failed      → shows error text
 *
 * Every bubble shows a lock icon and timestamp in the footer.
 * The lock icon signals that the channel is encrypted — even for
 * messages showing a decryption error.
 */
export default function MessageBubble({ msg, meId }) {
  const isSent = msg._isSent !== undefined
    ? msg._isSent
    : String(msg.sender_id) === String(meId);

  return (
    <div
      style={{ display: "flex", justifyContent: isSent ? "flex-end" : "flex-start", animation: "wb-fadeIn 0.2s ease" }}
    >
      <div
        style={{
          maxWidth:     "68%",
          minWidth:     80,
          padding:      "10px 14px 8px",
          borderRadius: isSent ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background:   isSent ? C.sentBg  : C.recvBg,
          border:       `1px solid ${isSent ? C.sentBord : C.recvBord}`,
        }}
      >
        {/* Content area */}
        {msg._error ? (
          <div style={{ color: C.error, fontSize: 13, fontStyle: "italic", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertIcon size={12} /> {msg._error}
          </div>
        ) : msg._plaintext !== undefined && msg._plaintext !== null ? (
          <p style={{ color: C.text, fontSize: 15, lineHeight: 1.55, wordBreak: "break-word" }}>
            {msg._plaintext}
          </p>
        ) : (
          /* Awaiting decryption */
          <div style={{ color: C.textMuted, fontSize: 13, fontStyle: "italic", display: "flex", alignItems: "center", gap: 6 }}>
            {isSent
              ? <><LockIcon size={11} /> Sent encrypted</>
              : <><Spinner size={12} color={C.accent} /> Decrypting…</>}
          </div>
        )}

        {/* Footer: timestamp + lock */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 5 }}>
          <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
            {fmtTime(msg.created_at)}
          </span>
          <LockIcon size={9} />
        </div>
      </div>
    </div>
  );
}

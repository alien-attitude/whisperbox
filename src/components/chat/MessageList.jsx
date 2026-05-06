import { useEffect, useRef } from "react";
import { C } from "../../styles/tokens";
import { ShieldIcon } from "../common/Icons";
import MessageBubble from "./MessageBubble";

/**
 * MessageList
 * ───────────
 * Scrollable area that renders all messages in the active thread.
 * Auto-scrolls to the bottom whenever the thread updates.
 * Shows an empty state when no messages exist yet.
 */
export default function MessageList({ messages, meId, contactName }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
        <ShieldIcon size={42} color={C.border} />
        <div style={{ textAlign: "center" }}>
          <p style={{ color: C.text, fontWeight: 600, fontSize: 15 }}>
            Messages are end-to-end encrypted
          </p>
          <p style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>
            Only you and {contactName} can read them
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 6 }}>
      {messages.map((msg, i) => (
        <MessageBubble key={msg.id || i} msg={msg} meId={meId} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

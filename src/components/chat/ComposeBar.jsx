import { useRef, useState } from "react";
import { C } from "../../styles/tokens";
import { Spinner } from "../common/Avatar";
import { SendIcon, LockIcon, AlertIcon, XIcon } from "../common/Icons";

/**
 * ComposeBar
 * ──────────
 * The message input area at the bottom of a conversation.
 *
 * - Auto-grows the textarea up to 120px
 * - Enter sends; Shift+Enter inserts a newline
 * - Shows the active encryption algorithm as a badge
 * - Error banner with dismiss button if send fails
 * - Disabled/greyed state when no text or sending is in progress
 */
export default function ComposeBar({ onSend, sending, error, onClearError }) {
  const [text, setText] = useState("");
  const textareaRef     = useRef(null);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const success = await onSend(text);
    if (success) {
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);
    // Auto-resize
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  const canSend = !!text.trim() && !sending;

  return (
    <div style={{ borderTop: `1px solid ${C.border}` }}>

      {/* Error banner */}
      {error && (
        <div style={{ margin: "8px 24px 0", padding: "10px 14px", background: C.errorD, border: `1px solid #7f1d1d`, borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 8 }}>
          <AlertIcon size={14} />
          <span style={{ color: C.error, fontSize: 13, lineHeight: 1.5, flex: 1 }}>{error}</span>
          <button onClick={onClearError} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 0 }}>
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Input row */}
      <div style={{ padding: "14px 24px 18px", display: "flex", gap: 10, alignItems: "flex-end" }}>

        {/* Algorithm badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, flexShrink: 0 }}>
          <LockIcon size={11} />
          <span style={{ fontSize: 11, color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>
            AES-GCM
          </span>
        </div>

        {/* Textarea wrapper */}
        <div
          style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "10px 16px", display: "flex", alignItems: "flex-end", gap: 8, transition: "border-color 0.15s" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
          onBlur={(e)  => (e.currentTarget.style.borderColor = C.border)}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Message… (Enter to send, Shift+Enter for newline)"
            rows={1}
            style={{ flex: 1, background: "none", border: "none", color: C.text, fontSize: 15, resize: "none", maxHeight: 120, lineHeight: 1.55, overflow: "hidden" }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="wb-btn"
          style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: canSend ? C.accent : C.surface, border: `1px solid ${canSend ? "transparent" : C.border}`, cursor: canSend ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", color: canSend ? "#07090f" : C.textMuted }}
        >
          {sending
            ? <Spinner size={16} color="#07090f" />
            : <SendIcon size={18} />}
        </button>
      </div>
    </div>
  );
}

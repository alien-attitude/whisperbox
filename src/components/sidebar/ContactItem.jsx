import { Avatar } from "../common/Avatar";
import { LockIcon } from "../common/Icons";
import { C } from "../../styles/tokens";
import { fmtTime } from "../../utils/helpers";

/**
 * ContactItem
 * ───────────
 * A single row in the sidebar — works for both conversations and search results.
 */
export default function ContactItem({ user, isActive, onClick, showKeyStatus = true, showTime = false }) {
  const displayName = user.display_name || user.username;

  return (
    <div
      onClick={() => onClick(user)}
      className="wb-conv"
      style={{
        padding:       "12px 16px",
        display:       "flex",
        alignItems:    "center",
        gap:           12,
        cursor:        "pointer",
        borderBottom:  `1px solid ${C.border}`,
        background:    isActive ? C.surface2 : "transparent",
        transition:    "background 0.12s",
      }}
    >
      {/* Avatar with online dot */}
      <div style={{ position: "relative" }}>
        <Avatar name={displayName} size={44} />
        {user._online !== undefined && (
          <div style={{
            position: "absolute", bottom: -1, right: -1,
            width: 12, height: 12, borderRadius: "50%",
            background: user._online ? C.green : C.border,
            border: `2px solid ${C.sidebar}`,
          }} />
        )}
      </div>

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </span>
          {showTime && user.last_message_at && (
            <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>
              {fmtTime(user.last_message_at)}
            </span>
          )}
        </div>
        {user.username !== displayName && (
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>@{user.username}</div>
        )}
        {showKeyStatus && (
          <div style={{ fontSize: 11, color: C.green, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <LockIcon size={9} /> E2EE ready
          </div>
        )}
      </div>
    </div>
  );
}

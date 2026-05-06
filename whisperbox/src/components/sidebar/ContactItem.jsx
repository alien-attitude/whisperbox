import { Avatar } from "../common/Avatar";
import { LockIcon } from "../common/Icons";
import { C } from "../../styles/tokens";

/**
 * ContactItem
 * ───────────
 * A single clickable row in the sidebar contacts list.
 * Shows an avatar, username, and a colour-coded E2EE-readiness indicator
 * (green = public key registered, red = no key yet).
 */
export default function ContactItem({ user, isActive, onClick }) {
  const hasKey = !!user.public_key;

  return (
    <div
      onClick={() => onClick(user)}
      className="wb-conv"
      style={{
        padding:       "13px 16px",
        display:       "flex",
        alignItems:    "center",
        gap:           12,
        cursor:        "pointer",
        borderBottom:  `1px solid ${C.border}`,
        background:    isActive ? C.surface2 : "transparent",
        transition:    "background 0.12s",
      }}
    >
      {/* Avatar with key-status dot */}
      <div style={{ position: "relative" }}>
        <Avatar name={user.username} size={44} />
        <div style={{
          position:     "absolute",
          bottom:       -1,
          right:        -1,
          width:        13,
          height:       13,
          borderRadius: "50%",
          background:   hasKey ? C.green : C.error,
          border:       `2px solid ${C.sidebar}`,
        }} />
      </div>

      {/* Name + status */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.username}
        </div>
        <div style={{ fontSize: 11, color: hasKey ? C.green : C.error, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
          <LockIcon size={9} />
          {hasKey ? "E2EE ready" : "No public key"}
        </div>
      </div>
    </div>
  );
}

import { C } from "../../styles/tokens";
import { Avatar } from "../common/Avatar";
import { ShieldIcon, LockIcon } from "../common/Icons";

/**
 * ChatHeader
 * ──────────
 * Top bar of the active conversation. Shows the recipient's name,
 * avatar, and a persistent E2EE status indicator.
 */
export default function ChatHeader({ user }) {
  return (
    <div style={{ padding: "14px 24px", background: C.sidebar, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14 }}>

      <Avatar name={user.username} size={40} />

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>
          {user.username}
        </div>
        <div style={{ fontSize: 12, color: C.green, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <ShieldIcon size={11} color={C.green} />
          End-to-end encrypted · Server stores only ciphertext
        </div>
      </div>

      {/* Encrypted badge */}
      <div style={{ padding: "5px 12px", background: C.greenD, border: `1px solid ${C.green}22`, borderRadius: 20, fontSize: 12, color: C.green, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
        <LockIcon size={10} /> Encrypted
      </div>
    </div>
  );
}

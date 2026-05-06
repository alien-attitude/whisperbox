import { C } from "../../styles/tokens";
import { Avatar } from "../common/Avatar";
import { ShieldIcon, LockIcon } from "../common/Icons";

export default function ChatHeader({ user }) {
  const displayName = user.display_name || user.username;
  return (
    <div style={{ padding: "14px 24px", background: C.sidebar, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ position: "relative" }}>
        <Avatar name={displayName} size={40} />
        {user._online !== undefined && (
          <div style={{ position: "absolute", bottom: -1, right: -1, width: 11, height: 11, borderRadius: "50%", background: user._online ? C.green : C.border, border: `2px solid ${C.sidebar}` }} />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{displayName}</div>
        {user.username !== displayName && (
          <div style={{ fontSize: 12, color: C.textMuted }}>@{user.username}</div>
        )}
        <div style={{ fontSize: 12, color: C.green, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          <ShieldIcon size={11} color={C.green} />
          End-to-end encrypted · Server stores only ciphertext
        </div>
      </div>
      <div style={{ padding: "5px 12px", background: C.greenD, border: `1px solid ${C.green}22`, borderRadius: 20, fontSize: 12, color: C.green, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
        <LockIcon size={10} /> Encrypted
      </div>
    </div>
  );
}

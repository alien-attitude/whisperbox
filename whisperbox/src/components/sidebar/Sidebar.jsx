import { useState } from "react";
import { C } from "../../styles/tokens";
import { Avatar } from "../common/Avatar";
import { ShieldIcon, LockIcon, SearchIcon } from "../common/Icons";
import ContactItem from "./ContactItem";

/**
 * Sidebar
 * ───────
 * Left panel: app branding, logged-in user info, contact search,
 * and the scrollable contacts list.
 */
export default function Sidebar({ me, users, selectedUser, onSelectUser }) {
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) =>
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside style={{ width: 290, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>

      {/* App header */}
      <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.border}` }}>

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: C.accentD, border: `1px solid ${C.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldIcon size={17} color={C.accent} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px", color: C.text }}>
            WhisperBox
          </span>
        </div>

        {/* Self info card */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.surface, borderRadius: 12 }}>
          <Avatar name={me.username} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {me.username}
            </div>
            <div style={{ fontSize: 11, color: C.green, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <LockIcon size={9} /> Keys active on this device
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <SearchIcon size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users…"
            style={{ background: "none", border: "none", color: C.text, fontSize: 14, flex: 1 }}
          />
        </div>
      </div>

      {/* Contacts list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>
            {users.length === 0 ? "No other users registered yet" : "No results"}
          </div>
        ) : (
          filtered.map((user) => (
            <ContactItem
              key={user.id}
              user={user}
              isActive={selectedUser?.id === user.id}
              onClick={onSelectUser}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
        Private key never leaves this browser
      </div>
    </aside>
  );
}

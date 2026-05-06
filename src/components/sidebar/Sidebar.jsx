import { useState, useEffect, useCallback, useRef } from "react";
import { C } from "../../styles/tokens";
import { Avatar } from "../common/Avatar";
import { ShieldIcon, LockIcon, SearchIcon } from "../common/Icons";
import { Spinner } from "../common/Avatar";
import ContactItem from "./ContactItem";
import API from "../../services/api";

/**
 * Sidebar
 * ───────
 * Shows:
 *  1. Existing conversations (from GET /conversations) — sorted by latest message
 *  2. User search results   (from GET /users/search?q=) — when typing in the search box
 *
 * Public keys are NOT fetched here — they are always fetched fresh at send time.
 */
export default function Sidebar({ auth, conversations, selectedUser, onSelectUser, onLogout }) {
  const [query,         setQuery]         = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching,     setSearching]     = useState(false);
  const debounceRef = useRef(null);

  // Debounced backend search
  const handleSearch = useCallback((value) => {
    setQuery(value);
    clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await API.searchUsers(auth.token, value);
        setSearchResults(results);
      } catch (e) {
        console.error("Search error:", e);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [auth?.token]);

  // When a search result is clicked, start a new conversation
  const handleSelectSearchResult = (user) => {
    setQuery("");
    setSearchResults([]);
    onSelectUser(user);
  };

  // Display conversations list when not searching, search results when searching
  const showSearch = query.trim().length > 0;

  return (
    <aside style={{ width: 300, background: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>

      {/* App header */}
      <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: C.accentD, border: `1px solid ${C.borderHi}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldIcon size={17} color={C.accent} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px", color: C.text, flex: 1 }}>
            WhisperBox
          </span>
          {/* Logout */}
          <button onClick={onLogout} title="Log out"
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, color: C.textMuted, cursor: "pointer", padding: "4px 8px", fontSize: 11, fontFamily: "inherit" }}>
            Sign out
          </button>
        </div>

        {/* Self info card */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: C.surface, borderRadius: 12 }}>
          <Avatar name={auth.me.display_name || auth.me.username} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {auth.me.display_name || auth.me.username}
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              @{auth.me.username}
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
          {searching
            ? <Spinner size={14} color={C.accent} />
            : <SearchIcon size={14} />}
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search users to message…"
            style={{ background: "none", border: "none", color: C.text, fontSize: 14, flex: 1 }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setSearchResults([]); }}
              style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 0, fontSize: 16, lineHeight: 1 }}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* List area */}
      <div style={{ flex: 1, overflowY: "auto" }}>

        {showSearch ? (
          /* ── Search results ── */
          searchResults.length === 0 && !searching ? (
            <div style={{ padding: "24px 20px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>
              No users found for "{query}"
            </div>
          ) : (
            <>
              <div style={{ padding: "8px 16px 4px", fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Search results
              </div>
              {searchResults.map((user) => (
                <ContactItem
                  key={user.id}
                  user={user}
                  isActive={selectedUser?.id === user.id}
                  onClick={handleSelectSearchResult}
                  showKeyStatus={false}
                />
              ))}
            </>
          )
        ) : (
          /* ── Conversations ── */
          conversations.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: C.textMuted, fontSize: 13, lineHeight: 1.7 }}>
              No conversations yet.<br />Search for a user above to start messaging.
            </div>
          ) : (
            <>
              <div style={{ padding: "8px 16px 4px", fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Messages
              </div>
              {conversations.map((conv) => (
                <ContactItem
                  key={conv.user_id}
                  user={{
                    id:           conv.user_id,
                    username:     conv.username,
                    display_name: conv.display_name,
                    _online:      conv._online,
                    last_message_at: conv.last_message_at,
                  }}
                  isActive={selectedUser?.id === conv.user_id}
                  onClick={onSelectUser}
                  showKeyStatus={false}
                  showTime
                />
              ))}
            </>
          )
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

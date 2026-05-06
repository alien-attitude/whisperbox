import { useEffect } from "react";
import { GLOBAL_CSS } from "./styles/tokens";
import { C } from "./styles/tokens";

import { useAuth }     from "./hooks/useAuth";
import { useKeys }     from "./hooks/useKeys";
import { useMessages } from "./hooks/useMessages";

import AuthScreen  from "./components/auth/AuthScreen";
import KeySetup    from "./components/setup/KeySetup";
import Sidebar     from "./components/sidebar/Sidebar";
import ChatHeader  from "./components/chat/ChatHeader";
import MessageList from "./components/chat/MessageList";
import ComposeBar  from "./components/chat/ComposeBar";
import EmptyState  from "./components/chat/EmptyState";

import { useState } from "react";

/**
 * App
 * ───
 * Root component. Wires three hooks together:
 *
 *   useAuth     — login / register / token refresh / logout
 *   useKeys     — key recovery (IndexedDB → server unwrap) and caching
 *   useMessages — encrypt/send/fetch/decrypt with WebSocket + HTTP fallback
 *
 * Render phases:
 *   1. <AuthScreen>  — not logged in
 *   2. <KeySetup>    — logged in, keys not yet ready
 *   3. Main layout   — fully operational
 */
export default function App() {
  const authMgr = useAuth();
  const keyMgr  = useKeys();
  const msgMgr  = useMessages(authMgr.auth, keyMgr.keys);

  const [selectedUser, setSelectedUser] = useState(null);

  // ── Inject global styles once ─────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById("wb-global-styles")) return;
    const el = document.createElement("style");
    el.id = "wb-global-styles";
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
  }, []);

  // ── After login/register → kick off key setup ─────────────────────────────
  useEffect(() => {
    if (!authMgr.auth) return;
    const { me, password } = authMgr.auth;
    keyMgr.setup(me.id, me, password);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authMgr.auth?.me?.id]);

  // ── After keys ready → load conversations ─────────────────────────────────
  useEffect(() => {
    if (keyMgr.ready && authMgr.auth) {
      msgMgr.loadConversations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyMgr.ready, authMgr.auth?.token]);

  // ── Poll / watch active thread ────────────────────────────────────────────
  useEffect(() => {
    if (!selectedUser || !keyMgr.ready) return;
    msgMgr.fetchThread(selectedUser.id);
    msgMgr.startPolling(selectedUser.id);
    return () => msgMgr.stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id, keyMgr.ready]);

  // ── Auth callbacks ────────────────────────────────────────────────────────

  /**
   * Called by AuthScreen after a successful login.
   * useAuth already stored the session; nothing extra to do here
   * since the useEffect above handles key setup.
   */
  const handleAuth = () => {};   // state change in useAuth triggers the effect

  /**
   * Called by AuthScreen for register.
   * useAuth.register() generates keys client-side and returns { session, keyPair }.
   * We cache the key pair immediately so key setup (useEffect) finds it in IndexedDB.
   */
  const handleRegister = async (username, displayName, password) => {
    const result = await authMgr.register(username, displayName, password);
    if (result) {
      // Cache the newly generated key pair before the key setup effect runs
      await keyMgr.cacheNewKeyPair(result.session.me.id, result.keyPair);
    }
    return result?.session ?? null;
  };

  const handleLogout = async () => {
    setSelectedUser(null);
    keyMgr.reset();
    await authMgr.logout();
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    msgMgr.clearSendError();
  };

  const handleSend = (text) => msgMgr.sendMessage(text, selectedUser);

  // ── Render phases ─────────────────────────────────────────────────────────

  if (!authMgr.auth) {
    return (
      <AuthScreen
        loading={authMgr.loading}
        error={authMgr.error}
        clearError={authMgr.clearError}
        onLogin={authMgr.login}
        onRegister={handleRegister}
        onAuth={handleAuth}
      />
    );
  }

  if (!keyMgr.ready) {
    return (
      <KeySetup
        status={keyMgr.status}
        isError={keyMgr.error}
        onRetry={() => keyMgr.setup(
          authMgr.auth.me.id,
          authMgr.auth.me,
          authMgr.auth.password
        )}
      />
    );
  }

  const thread = selectedUser ? (msgMgr.threads[selectedUser.id] || []) : [];

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text, overflow: "hidden" }}>

      <Sidebar
        auth={authMgr.auth}
        conversations={msgMgr.conversations}
        selectedUser={selectedUser}
        onSelectUser={handleSelectUser}
        onLogout={handleLogout}
      />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedUser ? (
          <>
            <ChatHeader user={selectedUser} />
            <MessageList
              messages={thread}
              meId={authMgr.auth.me.id}
              contactName={selectedUser.display_name || selectedUser.username}
            />
            <ComposeBar
              onSend={handleSend}
              sending={msgMgr.sending}
              error={msgMgr.sendError}
              onClearError={msgMgr.clearSendError}
            />
          </>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}

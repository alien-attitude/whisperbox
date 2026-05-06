import { useEffect } from "react";
import { C, GLOBAL_CSS } from "./styles/tokens";
import { useAuth }     from "./hooks/useAuth";
import { useKeys }     from "./hooks/useKeys";
import { useMessages } from "./hooks/useMessages";
import API             from "./services/api";

import AuthScreen from "./components/auth/AuthScreen";
import KeySetup   from "./components/setup/KeySetup";
import Sidebar    from "./components/sidebar/Sidebar";
import ChatHeader from "./components/chat/ChatHeader";
import MessageList from "./components/chat/MessageList";
import ComposeBar  from "./components/chat/ComposeBar";
import EmptyState  from "./components/chat/EmptyState";
import { useState } from "react";

/**
 * App
 * ───
 * Root component. Owns global state and wires together:
 *
 *   useAuth     — login / register / session
 *   useKeys     — key generation, IndexedDB storage, public key upload
 *   useMessages — fetch, decrypt, send, poll
 *
 * Render phases:
 *   1. AuthScreen  → user not logged in
 *   2. KeySetup    → keys not yet ready (generating / loading)
 *   3. Main layout → ready
 */
export default function App() {
  const auth     = useAuth();
  const keyMgr   = useKeys();
  const msgMgr   = useMessages(auth.auth, keyMgr.keys);

  const [users,        setUsers]        = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Inject global styles once
  useEffect(() => {
    if (document.getElementById("wb-global-styles")) return;
    const el = document.createElement("style");
    el.id = "wb-global-styles";
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
  }, []);

  // Kick off key setup after login
  useEffect(() => {
    if (auth.auth) {
      keyMgr.setup(auth.auth.me.id, auth.auth.token);
    }
  }, [auth.auth?.me?.id]);

  // Load user list once keys are ready
  useEffect(() => {
    if (!auth.auth || !keyMgr.ready) return;
    API.getUsers(auth.auth.token)
      .then((list) => setUsers(list.filter((u) => String(u.id) !== String(auth.auth.me.id))))
      .catch(console.error);
  }, [auth.auth?.token, keyMgr.ready]);

  // Start polling when a conversation is opened
  useEffect(() => {
    if (!selectedUser || !keyMgr.ready) return;
    msgMgr.startPolling(selectedUser.id);
    return () => msgMgr.stopPolling();
  }, [selectedUser?.id, keyMgr.ready]);

  // ── Render: not logged in
  if (!auth.auth) {
    return (
      <AuthScreen
        loading={auth.loading}
        error={auth.error}
        clearError={auth.clearError}
        onLogin={auth.login}
        onRegister={auth.register}
        onAuth={() => {}} // auth hook sets state internally
      />
    );
  }

  // ── Render: keys not ready
  if (!keyMgr.ready) {
    return (
      <KeySetup
        status={keyMgr.status}
        isError={keyMgr.error}
        onRetry={() => keyMgr.setup(auth.auth.me.id, auth.auth.token)}
      />
    );
  }

  // ── Render: main layout
  const thread = selectedUser ? (msgMgr.threads[selectedUser.id] || []) : [];

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    msgMgr.clearSendError();
  };

  const handleSend = (text) =>
    msgMgr.sendMessage(text, selectedUser, users);

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text, overflow: "hidden" }}>

      <Sidebar
        me={auth.auth.me}
        users={users}
        selectedUser={selectedUser}
        onSelectUser={handleSelectUser}
      />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedUser ? (
          <>
            <ChatHeader user={selectedUser} />
            <MessageList
              messages={thread}
              meId={auth.auth.me.id}
              contactName={selectedUser.username}
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

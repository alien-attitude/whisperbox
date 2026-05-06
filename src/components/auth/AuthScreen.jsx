import { useState } from "react";
import { C } from "../../styles/tokens";
import { Spinner } from "../common/Avatar";
import { ShieldIcon, AlertIcon } from "../common/Icons";

/**
 * AuthScreen
 * ──────────
 * Login and registration form.
 * Register collects display_name in addition to username + password,
 * matching the server's required fields.
 */
export default function AuthScreen({ loading, error, clearError, onLogin, onRegister, onAuth }) {
  const [mode,        setMode]        = useState("login");
  const [username,    setUsername]    = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password,    setPassword]    = useState("");

  const switchMode = (m) => { setMode(m); clearError(); };

  const submit = async () => {
    if (!username.trim() || !password.trim()) return;
    clearError();
    const result = mode === "login"
      ? await onLogin(username, password)
      : await onRegister(username, displayName || username, password);
    if (result) onAuth(result);
  };

  const loginFields = [
    { id: "un", label: "Username", val: username,    set: setUsername,    type: "text",     ph: "alice_92",   ac: "username"         },
    { id: "pw", label: "Password", val: password,    set: setPassword,    type: "password", ph: "••••••••",   ac: "current-password" },
  ];

  const registerFields = [
    { id: "un", label: "Username",     val: username,     set: setUsername,     type: "text",     ph: "alice_92",   ac: "username"         },
    { id: "dn", label: "Display Name", val: displayName,  set: setDisplayName,  type: "text",     ph: "Alice",      ac: "name"             },
    { id: "pw", label: "Password",     val: password,     set: setPassword,     type: "password", ph: "••••••••",   ac: "new-password"     },
  ];

  const fields = mode === "login" ? loginFields : registerFields;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, margin: "0 auto 16px", background: C.accentD, border: `1.5px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 40px ${C.accent}22` }}>
            <ShieldIcon size={30} color={C.accent} />
          </div>
          <h1 style={{ color: C.text, fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>WhisperBox</h1>
          <p style={{ color: C.textMuted, fontSize: 14, marginTop: 6 }}>End-to-end encrypted messaging</p>
        </div>

        {/* Card */}
        <div style={{ background: C.sidebar, borderRadius: 20, border: `1px solid ${C.border}`, padding: "32px 28px", boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}>

          {/* Mode tabs */}
          <div style={{ display: "flex", background: C.surface, borderRadius: 12, padding: 4, marginBottom: 28 }}>
            {[["login", "Sign In"], ["register", "Create Account"]].map(([m, label]) => (
              <button key={m} onClick={() => switchMode(m)}
                style={{ flex: 1, padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", transition: "all 0.15s", background: mode === m ? C.surface2 : "transparent", color: mode === m ? C.text : C.textMuted }}>
                {label}
              </button>
            ))}
          </div>

          {/* Fields */}
          {fields.map((f) => (
            <div key={f.id} style={{ marginBottom: 18 }}>
              <label htmlFor={f.id} style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>
                {f.label}{f.id === "dn" && <span style={{ color: C.textMuted, fontWeight: 400, textTransform: "none", marginLeft: 4 }}>(optional)</span>}
              </label>
              <input
                id={f.id} type={f.type} value={f.val}
                onChange={(e) => f.set(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={f.ph}
                autoComplete={f.ac}
                style={{ width: "100%", padding: "11px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 15, transition: "border-color 0.15s" }}
                onFocus={(e) => (e.target.style.borderColor = C.accent)}
                onBlur={(e)  => (e.target.style.borderColor = C.border)}
              />
            </div>
          ))}

          {/* Password hint for register */}
          {mode === "register" && (
            <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 16, marginTop: -10, lineHeight: 1.5 }}>
              Password must be 8–128 characters. It's used to protect your private key — choose something strong.
            </p>
          )}

          {/* Error */}
          {error && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px", background: C.errorD, border: `1px solid #7f1d1d`, borderRadius: 10, marginBottom: 16 }}>
              <div style={{ marginTop: 1, flexShrink: 0 }}><AlertIcon size={14} /></div>
              <div style={{ color: C.error, fontSize: 13, lineHeight: 1.6 }}>
                {error.split("\n").map((line, i) => <div key={i}>{line}</div>)}
              </div>
            </div>
          )}

          {/* Submit */}
          <button onClick={submit} disabled={loading || !username.trim() || !password.trim()} className="wb-btn"
            style={{ width: "100%", padding: 13, background: C.accent, border: "none", borderRadius: 12, color: "#07090f", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1, transition: "all 0.15s" }}>
            {loading && <Spinner size={16} color="#07090f" />}
            {loading
              ? (mode === "login" ? "Signing in…" : "Generating keys & creating account…")
              : (mode === "login" ? "Sign In"     : "Create Account")}
          </button>
        </div>

        {/* Trust signals */}
        <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          {[
            [C.green,  "AES-256-GCM messages"],
            [C.accent, "RSA-OAEP key exchange"],
            [C.green,  "AES-KW private key backup"],
          ].map(([color, text]) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textMuted }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />{text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

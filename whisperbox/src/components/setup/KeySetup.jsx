import { C } from "../../styles/tokens";
import { KeyIcon, AlertIcon, RefreshIcon } from "../common/Icons";

/**
 * KeySetup
 * ────────
 * Full-screen overlay displayed while the app is generating / loading
 * the user's RSA key pair. Shows a progress message and a loading bar,
 * or an error state with a retry button if setup fails.
 */
export default function KeySetup({ status, isError, onRetry }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: C.sidebar, border: `1px solid ${isError ? "#7f1d1d" : C.border}`, borderRadius: 20, padding: "2.5rem 2rem", width: "min(380px, 90vw)", textAlign: "center" }}>

        {/* Icon circle */}
        <div style={{ width: 64, height: 64, borderRadius: "50%", border: `2px solid ${isError ? C.error : C.green}`, background: isError ? C.errorD : C.greenD, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          {isError
            ? <AlertIcon size={28} />
            : <KeyIcon   size={28} />}
        </div>

        <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          {isError ? "Key setup failed" : "Setting up encryption"}
        </h2>

        <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6, marginBottom: 24, padding: "0 12px" }}>
          {status}
        </p>

        {isError ? (
          <button onClick={onRetry} className="wb-btn"
            style={{ padding: "10px 24px", background: C.accent, border: "none", borderRadius: 10, color: "#07090f", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <RefreshIcon size={14} /> Try again
          </button>
        ) : (
          /* Animated progress bar */
          <div style={{ height: 3, background: C.surface, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "40%", background: C.accent, borderRadius: 2, animation: "wb-bar 1.8s ease-in-out infinite" }} />
          </div>
        )}
      </div>
    </div>
  );
}

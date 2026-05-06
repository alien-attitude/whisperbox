import { C } from "../../styles/tokens";
import { ShieldIcon } from "../common/Icons";

const INFO_ITEMS = [
  ["AES-256-GCM",    "Messages encrypted before leaving your device"],
  ["RSA-2048-OAEP",  "Keys exchanged without server seeing them"],
  ["IndexedDB",      "Private key stored locally — never on server"],
];

/**
 * EmptyState
 * ──────────
 * Shown in the main area when no conversation is selected.
 * Doubles as a quick reference for the encryption architecture.
 */
export default function EmptyState() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 32 }}>

      <div style={{ width: 88, height: 88, borderRadius: 22, background: C.surface, border: `2px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ShieldIcon size={38} color={C.border} />
      </div>

      <div style={{ textAlign: "center" }}>
        <p style={{ color: C.text, fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
          No conversation open
        </p>
        <p style={{ color: C.textMuted, fontSize: 14 }}>
          Select a contact from the sidebar to start messaging
        </p>
      </div>

      {/* Encryption detail card */}
      <div style={{ padding: "16px 20px", background: C.surface, borderRadius: 14, maxWidth: 340, width: "100%" }}>
        {INFO_ITEMS.map(([label, desc], i) => (
          <div key={label} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < INFO_ITEMS.length - 1 ? 12 : 0 }}>
            <code style={{ fontSize: 11, color: C.accent, background: C.accentD, padding: "2px 6px", borderRadius: 5, fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0, marginTop: 2 }}>
              {label}
            </code>
            <span style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.5 }}>
              {desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

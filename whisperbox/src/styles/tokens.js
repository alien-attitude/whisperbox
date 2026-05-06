export const C = {
  bg:        "#07090f",
  sidebar:   "#0c1018",
  surface:   "#111620",
  surface2:  "#161d2c",
  border:    "#1e2840",
  borderHi:  "#2a3a5c",
  accent:    "#38bdf8",
  accentD:   "#0c4a6e",
  green:     "#4ade80",
  greenD:    "#052e16",
  text:      "#e2e8f5",
  textMuted: "#5a7a9a",
  error:     "#f87171",
  errorD:    "#1c0b0b",
  sentBg:    "#0a2a3e",
  sentBord:  "#1a4f6e",
  recvBg:    "#111620",
  recvBord:  "#1e2840",
};

export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; }
  @keyframes wb-spin    { to { transform: rotate(360deg); } }
  @keyframes wb-fadeIn  { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @keyframes wb-bar     { 0%,100% { transform: scaleX(0.3) translateX(0); } 50% { transform: scaleX(0.6) translateX(80%); } }
  body { font-family: 'IBM Plex Sans', system-ui, sans-serif; }
  ::-webkit-scrollbar       { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e2840; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #2a3a5c; }
  .wb-btn:hover  { opacity: 0.85; }
  .wb-btn:active { transform: scale(0.97); }
  .wb-conv:hover { background: #161d2c !important; }
  input, textarea { font-family: 'IBM Plex Sans', system-ui, sans-serif; }
  input::placeholder, textarea::placeholder { color: #5a7a9a; }
  input:focus, textarea:focus { outline: none; }
`;

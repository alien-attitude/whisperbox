/**
 * Icons
 * ─────
 * Inline SVG icons — no icon font or external library dependency.
 * Each icon accepts `size` and `color` props.
 */

const Svg = ({ size, children, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
    {...rest}
  >
    {children}
  </svg>
);

export const ShieldIcon = ({ size = 16, color }) => (
  <Svg size={size} stroke={color || "currentColor"}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Svg>
);

export const LockIcon = ({ size = 14 }) => (
  <Svg size={size}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Svg>
);

export const SendIcon = ({ size = 18 }) => (
  <Svg size={size}>
    <path d="M22 2L11 13" />
    <path d="M22 2L15 22 11 13 2 9 22 2" />
  </Svg>
);

export const KeyIcon = ({ size = 16 }) => (
  <Svg size={size}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </Svg>
);

export const SearchIcon = ({ size = 16 }) => (
  <Svg size={size}>
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21L16.65 16.65" />
  </Svg>
);

export const AlertIcon = ({ size = 16 }) => (
  <Svg size={size}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </Svg>
);

export const XIcon = ({ size = 16 }) => (
  <Svg size={size}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Svg>
);

export const RefreshIcon = ({ size = 16 }) => (
  <Svg size={size}>
    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </Svg>
);

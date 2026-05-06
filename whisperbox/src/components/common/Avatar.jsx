import { usernameHue } from "../../utils/helpers";

/**
 * Spinner
 * A simple CSS-animated loading indicator.
 */
export function Spinner({ size = 18, color = "#fff" }) {
  return (
    <span
      style={{
        display:        "inline-block",
        width:          size,
        height:         size,
        border:         `2px solid rgba(255,255,255,0.15)`,
        borderTopColor: color,
        borderRadius:   "50%",
        animation:      "wb-spin 0.7s linear infinite",
        flexShrink:     0,
      }}
    />
  );
}

/**
 * Avatar
 * Shows the first two characters of a username on a consistently-colored
 * circular background. The color is derived deterministically from the
 * username string so it's stable across renders.
 */
export function Avatar({ name = "?", size = 36 }) {
  const hue = usernameHue(name);
  return (
    <div
      style={{
        width:          size,
        height:         size,
        borderRadius:   "50%",
        flexShrink:     0,
        background:     `hsl(${hue},40%,15%)`,
        border:         `1.5px solid hsl(${hue},45%,28%)`,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        fontSize:       size * 0.37,
        fontWeight:     700,
        color:          `hsl(${hue},60%,72%)`,
        letterSpacing:  "-0.5px",
        userSelect:     "none",
      }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// Converts a hex color (#rrggbb) to an "H S% L%" string used by our Tailwind tokens.
export const hexToHslString = (hex: string): string | null => {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// Pick black or white foreground based on perceived brightness of the hex color.
const foregroundFor = (hex: string): string => {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return "0 0% 100%";
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  // YIQ luminance
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "210 25% 18%" : "0 0% 100%";
};

const DEFAULTS = {
  primary: "210 12% 75%",
  primaryFg: "210 25% 18%",
  gradient: "linear-gradient(135deg, hsl(210, 12%, 78%), hsl(210, 10%, 68%))",
};

export const applyPrimaryColor = (hex: string | null | undefined) => {
  const root = document.documentElement;
  if (!hex) {
    root.style.removeProperty("--primary");
    root.style.removeProperty("--primary-foreground");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--gradient-primary");
    return;
  }
  const hsl = hexToHslString(hex);
  if (!hsl) return;
  root.style.setProperty("--primary", hsl);
  root.style.setProperty("--primary-foreground", foregroundFor(hex));
  root.style.setProperty("--ring", hsl);
  root.style.setProperty("--gradient-primary", `linear-gradient(135deg, hsl(${hsl}), hsl(${hsl}))`);
};

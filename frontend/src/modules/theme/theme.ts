export type ThemeColorKey =
  | "bg"
  | "panel"
  | "ink"
  | "inkMuted"
  | "border"
  | "accent"
  | "accentDark"
  | "blueSoft"
  | "blueSoftHover"
  | "blueSoft2"
  | "blueSoft3"
  | "redSoft"
  | "redSoftHover"
  | "redAccent";

export type ThemeColors = Record<ThemeColorKey, string>;

export type ThemeTemplate = {
  id: string;
  name: string;
  colors: ThemeColors;
  createdAt: string;
};

type ThemeField = {
  key: ThemeColorKey;
  label: string;
  cssVar: string;
  defaultHex: string;
};

export const THEME_TEMPLATES_STORAGE_KEY = "fsm_theme_templates_v1";
export const ACTIVE_THEME_STORAGE_KEY = "fsm_active_theme_v1";

export const THEME_FIELDS: ThemeField[] = [
  { key: "bg", label: "Page Background", cssVar: "--fsm-bg", defaultHex: "#f8fbff" },
  { key: "panel", label: "Panel Surface", cssVar: "--fsm-panel", defaultHex: "#ffffff" },
  { key: "ink", label: "Primary Text", cssVar: "--fsm-ink", defaultHex: "#0f172a" },
  { key: "inkMuted", label: "Muted Text", cssVar: "--fsm-ink-muted", defaultHex: "#475569" },
  { key: "border", label: "Borders", cssVar: "--fsm-border", defaultHex: "#cbd5e1" },
  { key: "accent", label: "Primary Accent", cssVar: "--fsm-accent", defaultHex: "#4285f4" },
  { key: "accentDark", label: "Primary Accent Dark", cssVar: "--fsm-accent-dark", defaultHex: "#1a73e8" },
  { key: "blueSoft", label: "Blue Surface 1", cssVar: "--fsm-blue-soft", defaultHex: "#eff6ff" },
  {
    key: "blueSoftHover",
    label: "Blue Surface Hover",
    cssVar: "--fsm-blue-soft-hover",
    defaultHex: "#dbeafe"
  },
  { key: "blueSoft2", label: "Blue Surface 2", cssVar: "--fsm-blue-soft-2", defaultHex: "#e7f0ff" },
  { key: "blueSoft3", label: "Blue Surface 3", cssVar: "--fsm-blue-soft-3", defaultHex: "#dbeafe" },
  { key: "redSoft", label: "Secondary Red Soft", cssVar: "--fsm-red-soft", defaultHex: "#fee2e2" },
  {
    key: "redSoftHover",
    label: "Secondary Red Hover",
    cssVar: "--fsm-red-soft-hover",
    defaultHex: "#fecaca"
  },
  { key: "redAccent", label: "Secondary Red Accent", cssVar: "--fsm-red-accent", defaultHex: "#ef4444" }
];

const normalizeHex = (value: string): string => {
  const hex = value.trim().replace("#", "");
  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((char) => char + char)
      .join("")
      .toLowerCase()}`;
  }
  if (hex.length === 6) return `#${hex.toLowerCase()}`;
  return "#000000";
};

const hexToRgbTuple = (hex: string): string => {
  const safeHex = normalizeHex(hex).slice(1);
  const value = Number.parseInt(safeHex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `${r} ${g} ${b}`;
};

const rgbTupleToHex = (value: string): string => {
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part))
    .slice(0, 3);
  if (parts.length !== 3) return "#000000";
  return `#${parts.map((part) => Math.max(0, Math.min(255, part)).toString(16).padStart(2, "0")).join("")}`;
};

export const getDefaultThemeColors = (): ThemeColors => {
  const out = {} as ThemeColors;
  for (const field of THEME_FIELDS) {
    out[field.key] = field.defaultHex;
  }
  return out;
};

export const readCurrentThemeColors = (): ThemeColors => {
  const computed = getComputedStyle(document.documentElement);
  const out = {} as ThemeColors;
  for (const field of THEME_FIELDS) {
    const raw = computed.getPropertyValue(field.cssVar);
    out[field.key] = raw ? rgbTupleToHex(raw) : field.defaultHex;
  }
  return out;
};

export const applyThemeColors = (colors: ThemeColors): void => {
  const root = document.documentElement;
  for (const field of THEME_FIELDS) {
    root.style.setProperty(field.cssVar, hexToRgbTuple(colors[field.key]));
  }
};

export const loadTemplates = (): ThemeTemplate[] => {
  try {
    const raw = localStorage.getItem(THEME_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ThemeTemplate[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

export const saveTemplates = (templates: ThemeTemplate[]): void => {
  localStorage.setItem(THEME_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
};

export const saveActiveTheme = (colors: ThemeColors): void => {
  localStorage.setItem(ACTIVE_THEME_STORAGE_KEY, JSON.stringify(colors));
};

export const loadActiveTheme = (): ThemeColors | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ThemeColors>;
    const base = getDefaultThemeColors();
    for (const field of THEME_FIELDS) {
      const value = parsed[field.key];
      if (typeof value === "string" && value.startsWith("#")) {
        base[field.key] = normalizeHex(value);
      }
    }
    return base;
  } catch {
    return null;
  }
};

export const initializeThemeFromStorage = (): void => {
  const active = loadActiveTheme();
  if (active) applyThemeColors(active);
};

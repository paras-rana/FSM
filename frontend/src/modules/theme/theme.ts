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
const THEME_VERSION_STORAGE_KEY = "fsm_theme_version_v1";
const CURRENT_THEME_VERSION = "modern-bold-v1";

const LEGACY_DEFAULT_THEME_COLORS: ThemeColors = {
  bg: "#f8fbff",
  panel: "#ffffff",
  ink: "#0f172a",
  inkMuted: "#475569",
  border: "#cbd5e1",
  accent: "#4285f4",
  accentDark: "#1a73e8",
  blueSoft: "#eff6ff",
  blueSoftHover: "#dbeafe",
  blueSoft2: "#e7f0ff",
  blueSoft3: "#dbeafe",
  redSoft: "#fee2e2",
  redSoftHover: "#fecaca",
  redAccent: "#ef4444"
};

export const THEME_FIELDS: ThemeField[] = [
  { key: "bg", label: "Page Background", cssVar: "--fsm-bg", defaultHex: "#ecfdf5" },
  { key: "panel", label: "Panel Surface", cssVar: "--fsm-panel", defaultHex: "#ffffff" },
  { key: "ink", label: "Primary Text", cssVar: "--fsm-ink", defaultHex: "#0f172a" },
  { key: "inkMuted", label: "Muted Text", cssVar: "--fsm-ink-muted", defaultHex: "#475569" },
  { key: "border", label: "Borders", cssVar: "--fsm-border", defaultHex: "#a7f3d0" },
  { key: "accent", label: "Primary Accent", cssVar: "--fsm-accent", defaultHex: "#0ea5e9" },
  { key: "accentDark", label: "Primary Accent Dark", cssVar: "--fsm-accent-dark", defaultHex: "#0369a1" },
  { key: "blueSoft", label: "Blue Surface 1", cssVar: "--fsm-blue-soft", defaultHex: "#e0f2fe" },
  {
    key: "blueSoftHover",
    label: "Blue Surface Hover",
    cssVar: "--fsm-blue-soft-hover",
    defaultHex: "#bae6fd"
  },
  { key: "blueSoft2", label: "Blue Surface 2", cssVar: "--fsm-blue-soft-2", defaultHex: "#f0fdfa" },
  { key: "blueSoft3", label: "Blue Surface 3", cssVar: "--fsm-blue-soft-3", defaultHex: "#dcfce7" },
  { key: "redSoft", label: "Secondary Red Soft", cssVar: "--fsm-red-soft", defaultHex: "#ffedd5" },
  {
    key: "redSoftHover",
    label: "Secondary Red Hover",
    cssVar: "--fsm-red-soft-hover",
    defaultHex: "#fed7aa"
  },
  { key: "redAccent", label: "Secondary Red Accent", cssVar: "--fsm-red-accent", defaultHex: "#ea580c" }
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

const areThemesEqual = (a: ThemeColors, b: ThemeColors): boolean =>
  THEME_FIELDS.every((field) => normalizeHex(a[field.key]) === normalizeHex(b[field.key]));

export const initializeThemeFromStorage = (): void => {
  const defaults = getDefaultThemeColors();
  const active = loadActiveTheme();
  if (!active) {
    applyThemeColors(defaults);
    saveActiveTheme(defaults);
    localStorage.setItem(THEME_VERSION_STORAGE_KEY, CURRENT_THEME_VERSION);
    return;
  }

  const storedVersion = localStorage.getItem(THEME_VERSION_STORAGE_KEY);
  if (storedVersion !== CURRENT_THEME_VERSION) {
    applyThemeColors(defaults);
    saveActiveTheme(defaults);
    saveTemplates([]);
    localStorage.setItem(THEME_VERSION_STORAGE_KEY, CURRENT_THEME_VERSION);
    return;
  }

  applyThemeColors(active);
};

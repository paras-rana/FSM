import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import {
  THEME_FIELDS,
  applyThemeColors,
  getDefaultThemeColors,
  loadTemplates,
  readCurrentThemeColors,
  saveActiveTheme,
  saveTemplates,
  type ThemeColors,
  type ThemeTemplate
} from "../modules/theme/theme";

const makeTemplateId = () => `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
type ThemePreset = { id: string; name: string; colors: ThemeColors };

export const ThemeTemplatesPage = () => {
  const presetThemes = useMemo<ThemePreset[]>(
    () => [
      {
        id: "clean-white-default",
        name: "Clean White Default",
        colors: getDefaultThemeColors()
      },
      {
        id: "skyline-light",
        name: "Skyline Light",
        colors: {
          ...getDefaultThemeColors(),
          bg: "#f4f8ff",
          panel: "#ffffff",
          ink: "#172554",
          inkMuted: "#475569",
          border: "#bfdbfe",
          accent: "#2563eb",
          accentDark: "#1d4ed8",
          blueSoft: "#eff6ff",
          blueSoftHover: "#dbeafe",
          blueSoft2: "#f8fbff",
          blueSoft3: "#eaf2ff",
          redSoft: "#fef2f2",
          redSoftHover: "#fee2e2",
          redAccent: "#dc2626"
        }
      },
      {
        id: "slate-breeze",
        name: "Slate Breeze",
        colors: {
          ...getDefaultThemeColors(),
          bg: "#f8fafc",
          panel: "#ffffff",
          ink: "#0f172a",
          inkMuted: "#64748b",
          border: "#cbd5e1",
          accent: "#0ea5e9",
          accentDark: "#0284c7",
          blueSoft: "#f1f5f9",
          blueSoftHover: "#e2e8f0",
          blueSoft2: "#f8fafc",
          blueSoft3: "#f0f9ff",
          redSoft: "#fff1f2",
          redSoftHover: "#ffe4e6",
          redAccent: "#e11d48"
        }
      }
    ],
    []
  );

  const [colors, setColors] = useState<ThemeColors>(getDefaultThemeColors());
  const [templates, setTemplates] = useState<ThemeTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState(presetThemes[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setColors(readCurrentThemeColors());
    setTemplates(loadTemplates());
  }, []);

  const hasTemplates = templates.length > 0;

  const swatchStyle = useMemo(
    () => ({
      background: `linear-gradient(135deg, ${colors.panel} 0%, ${colors.blueSoft} 60%, ${colors.accent} 100%)`,
      borderColor: colors.border,
      color: colors.ink
    }),
    [colors]
  );

  const setColor = (key: keyof ThemeColors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const applyDraft = () => {
    applyThemeColors(colors);
    saveActiveTheme(colors);
    setError(null);
  };

  const resetToDefaults = () => {
    const defaults = getDefaultThemeColors();
    setColors(defaults);
    applyThemeColors(defaults);
    saveActiveTheme(defaults);
    setError(null);
  };

  const saveTemplate = () => {
    const name = templateName.trim();
    if (!name) {
      setError("Template name is required.");
      return;
    }
    const next: ThemeTemplate = {
      id: makeTemplateId(),
      name,
      colors,
      createdAt: new Date().toISOString()
    };
    const updated = [next, ...templates];
    setTemplates(updated);
    saveTemplates(updated);
    setTemplateName("");
    setError(null);
  };

  const applyTemplate = (template: ThemeTemplate) => {
    setColors(template.colors);
    applyThemeColors(template.colors);
    saveActiveTheme(template.colors);
    setError(null);
  };

  const removeTemplate = (templateId: string) => {
    const updated = templates.filter((item) => item.id !== templateId);
    setTemplates(updated);
    saveTemplates(updated);
  };

  const applyPreset = () => {
    const preset = presetThemes.find((item) => item.id === selectedPresetId);
    if (!preset) {
      setError("Preset not found.");
      return;
    }
    setColors(preset.colors);
    applyThemeColors(preset.colors);
    saveActiveTheme(preset.colors);
    setError(null);
  };

  return (
    <AppShell title="Theme Templates">
      <section className="p-6">
        <h2 className="text-xl font-semibold mb-4">Theme Studio</h2>
        <p className="text-sm text-fsm-ink-muted mb-4">
          Pick colors, apply instantly, and save reusable templates.
        </p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="rounded-xl border border-fsm-border bg-fsm-panel p-4 mb-4">
          <h3 className="font-semibold mb-3">Preset Themes</h3>
          <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end">
            <label className="grid gap-1">
              <span className="text-sm text-fsm-ink-muted">Select Preset</span>
              <select
                className="rounded border border-fsm-border px-3 py-2"
                value={selectedPresetId}
                onChange={(event) => setSelectedPresetId(event.target.value)}
              >
                {presetThemes.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={applyPreset}
              className="rounded bg-fsm-accent text-white px-3 py-2 text-sm hover:bg-fsm-accentDark"
            >
              Apply Preset
            </button>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-fsm-border bg-fsm-panel p-4">
            <h3 className="font-semibold mb-3">Colors</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {THEME_FIELDS.map((field) => (
                <label key={field.key} className="grid gap-1">
                  <span className="text-sm text-fsm-ink-muted">{field.label}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colors[field.key]}
                      onChange={(event) => setColor(field.key, event.target.value)}
                      className="h-9 w-12 rounded border border-fsm-border bg-white cursor-pointer"
                    />
                    <input
                      type="text"
                      value={colors[field.key]}
                      onChange={(event) => setColor(field.key, event.target.value)}
                      className="rounded border border-fsm-border px-2 py-1 w-full text-sm"
                    />
                  </div>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                onClick={applyDraft}
                className="rounded bg-fsm-accent text-white px-3 py-2 text-sm hover:bg-fsm-accentDark"
              >
                Apply Theme
              </button>
              <button
                type="button"
                onClick={resetToDefaults}
                className="rounded border border-fsm-border px-3 py-2 text-sm hover:bg-fsm-blue-soft"
              >
                Reset Defaults
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-fsm-border bg-fsm-panel p-4">
            <h3 className="font-semibold mb-3">Preview</h3>
            <article className="rounded-xl border p-4" style={swatchStyle}>
              <h4 className="text-lg font-semibold">Sample Card</h4>
              <p className="text-sm mt-1 opacity-80">
                Buttons, panels, and borders will use your selected palette after applying.
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  className="rounded px-3 py-1.5 text-sm text-white"
                  style={{ backgroundColor: colors.accent }}
                >
                  Primary
                </button>
                <button
                  type="button"
                  className="rounded px-3 py-1.5 text-sm"
                  style={{ backgroundColor: colors.redSoft, color: colors.ink, border: `1px solid ${colors.border}` }}
                >
                  Secondary
                </button>
              </div>
            </article>

            <div className="mt-4">
              <label className="grid gap-1">
                <span className="text-sm text-fsm-ink-muted">Template Name</span>
                <input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="e.g. Corporate Blue"
                  className="rounded border border-fsm-border px-3 py-2"
                />
              </label>
              <button
                type="button"
                onClick={saveTemplate}
                className="mt-3 rounded bg-fsm-accent text-white px-3 py-2 text-sm hover:bg-fsm-accentDark"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="p-6">
        <h2 className="text-xl font-semibold mb-3">Saved Templates</h2>
        {!hasTemplates ? (
          <p className="text-sm text-fsm-ink-muted">No templates saved yet.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-fsm-border">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id} className="border-b border-fsm-border last:border-0">
                    <td className="py-2 pr-3">{template.name}</td>
                    <td className="py-2 pr-3">{new Date(template.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => applyTemplate(template)}
                          className="rounded border border-fsm-border px-2 py-1 hover:bg-fsm-blue-soft"
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTemplate(template.id)}
                          className="rounded border border-fsm-border px-2 py-1 hover:bg-fsm-red-soft"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
};

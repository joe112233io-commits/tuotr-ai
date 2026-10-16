import React, { useState, useEffect } from "react";
import { STR } from "../i18n";
import { AIProvider, PresetProvider } from "../ai";
import { AISettings } from "../types";

interface SettingsProps {
  currentLang: string;
  onToast: (msg: string, kind?: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ currentLang, onToast }) => {
  const presets = AIProvider.presets;
  const [settings, setSettings] = useState<AISettings>(AIProvider.settings);
  const [presetKey, setPresetKey] = useState<string>(
    settings.preset && presets[settings.preset] ? settings.preset : "openrouter"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testOkMsg, setTestOkMsg] = useState<string>("");
  const [testErrMsg, setTestErrMsg] = useState<string>("");

  const isAr = currentLang === "ar";
  const t = (k: string) => (STR as any)[currentLang]?.[k] || (STR.en as any)?.[k] || k;

  useEffect(() => {
    AIProvider.load().then((s) => {
      setSettings(s);
      setPresetKey(s.preset && presets[s.preset] ? s.preset : "openrouter");
    });
  }, []);

  const activePreset: PresetProvider = presets[presetKey] || presets.openrouter;
  const activeName = AIProvider.activeName(currentLang);

  const handleSelectPreset = (key: string) => {
    setPresetKey(key);
    const p = presets[key];
    if (p) {
      setSettings((prev) => ({
        ...prev,
        preset: key,
        baseUrl: p.baseUrl,
        model: p.models && p.models.length > 0 ? p.models[0] : prev.model,
      }));
    }
    setTestOkMsg("");
    setTestErrMsg("");
  };

  const handleSelectModel = (modelId: string) => {
    setSettings((prev) => ({ ...prev, model: modelId }));
    setTestOkMsg("");
    setTestErrMsg("");
  };

  const handleSave = async () => {
    setTestErrMsg("");
    setTestOkMsg("");
    await AIProvider.save(settings);
    const isCustomActive = AIProvider.isCustom();
    setTestOkMsg(t("setSaved") + (isCustomActive ? " " + t("customOn") : ""));
    onToast(t("setSaved"), "ok");
  };

  const handleResetDefaults = async () => {
    const defaultSettings: AISettings = {
      enabled: false,
      preset: "openrouter",
      baseUrl: presets.openrouter.baseUrl,
      apiKey: "",
      model: "deepseek/deepseek-r1:free",
      temperature: 0.7,
      mindmap: true,
    };
    setSettings(defaultSettings);
    setPresetKey("openrouter");
    await AIProvider.save(defaultSettings);
    setTestOkMsg(t("resetToast"));
    setTestErrMsg("");
    onToast(t("resetToast"), "ok");
  };

  const handleTest = async () => {
    setTestErrMsg("");
    setTestOkMsg("");

    if (!settings.baseUrl || !settings.model) {
      setTestErrMsg(t("testNeed"));
      return;
    }

    if (activePreset && activePreset.keyRequired && !settings.apiKey) {
      setTestErrMsg(t("testNeedKey"));
      return;
    }

    setTesting(true);
    try {
      await AIProvider.save(settings);
      const res = await AIProvider.test();
      setTestOkMsg(`${t("testOk")} ${res.elapsed}ms! (${String(res.text).slice(0, 70)})`);
    } catch (e: any) {
      setTestErrMsg(t("testFail") + (e?.message ? ` (${e.message})` : ""));
    } finally {
      setTesting(false);
    }
  };

  // Filter presets based on category
  const filteredPresetKeys = Object.keys(presets).filter((k) => {
    if (categoryFilter === "all") return true;
    const p = presets[k];
    if (categoryFilter === "free") return p.category === "free";
    if (categoryFilter === "cloud") return p.category === "cloud";
    if (categoryFilter === "coding") return p.category === "coding";
    if (categoryFilter === "local") return p.category === "local";
    return true;
  });

  return (
    <div className="main-container" style={{ paddingBottom: 80, maxWidth: 860 }}>
      {/* Page Header */}
      <div className="page-head" style={{ textAlign: "start", marginBottom: 24, marginTop: 16 }}>
        <h1 style={{ fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 800 }}>{t("setTitle")}</h1>
        <p style={{ color: "var(--muted)", fontSize: 16, marginTop: 6, maxWidth: 680 }}>
          {t("setSub")}
        </p>
      </div>

      {/* Active Backend Status Banner */}
      <div
        style={{
          background: settings.enabled && settings.baseUrl
            ? "linear-gradient(135deg, #f5f3ff, #ede9fe)"
            : "linear-gradient(135deg, #f0fdf4, #dcfce7)",
          border: `1.5px solid ${settings.enabled && settings.baseUrl ? "#c4b5fd" : "#86efac"}`,
          borderRadius: 16,
          padding: "16px 20px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: settings.enabled && settings.baseUrl ? "var(--alpha)" : "#16a34a",
              boxShadow: `0 0 0 4px ${settings.enabled && settings.baseUrl ? "rgba(124,58,237,.2)" : "rgba(22,163,74,.2)"}`,
              display: "inline-block",
            }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
              {t("backendL")}{" "}
              <span style={{ color: settings.enabled && settings.baseUrl ? "var(--alpha)" : "#15803d" }}>
                {activeName || t("builtin")}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
              {settings.enabled && settings.baseUrl
                ? (isAr ? "يتم توجيه التوليد حالياً عبر المزود الخارجي المخصص." : "Generations are routed through your selected custom provider.")
                : (isAr ? "محرك الذكاء المدمج جاهز ويعمل مجاناً دون الحاجة لأي مفتاح أو اشتراك." : "Built-in AI engine is active. Ready to generate courses with zero configuration.")}
            </div>
          </div>
        </div>

        <span
          className="badge"
          style={{
            background: settings.enabled && settings.baseUrl ? "var(--alpha)" : "#16a34a",
            color: "#fff",
            fontSize: 12,
            padding: "6px 14px",
            borderRadius: 999,
            fontWeight: 700,
          }}
        >
          {settings.enabled && settings.baseUrl ? t("statusCustomActive") : t("statusDefaultActive")}
        </span>
      </div>

      {/* Main Settings Card */}
      <div className="panel" style={{ boxShadow: "0 12px 40px -15px rgba(124,58,237,.15)", border: "1.5px solid var(--line)" }}>
        {/* Toggle Custom Provider Switch */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 20,
            borderBottom: "1px solid var(--line)",
            marginBottom: 24,
            gap: 16,
          }}
        >
          <div className="toggle-row" style={{ margin: 0 }}>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              />
              <span className="knob"></span>
            </label>
            <div>
              <b style={{ fontSize: 16, color: "var(--ink)" }}>{t("useCustom")}</b>
              <br />
              <small style={{ color: "var(--muted)", fontSize: 13 }}>{t("useCustomSub")}</small>
            </div>
          </div>
        </div>

        {/* Configuration Area */}
        <div style={{ opacity: settings.enabled ? 1 : 0.45, transition: "opacity .2s", pointerEvents: settings.enabled ? "auto" : "none" }}>
          {/* Category Filter Chips */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontWeight: 700, fontSize: 14, marginBottom: 8, color: "var(--ink)" }}>
              {t("presetL")}
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {[
                { key: "all", label: t("catAll") },
                { key: "free", label: t("catFree") },
                { key: "coding", label: t("catCoding") },
                { key: "cloud", label: t("catCloud") },
                { key: "local", label: t("catLocal") },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategoryFilter(c.key)}
                  style={{
                    border: categoryFilter === c.key ? "1.5px solid var(--alpha)" : "1px solid var(--line)",
                    background: categoryFilter === c.key ? "var(--alpha-50)" : "#fff",
                    color: categoryFilter === c.key ? "var(--alpha-dark)" : "var(--muted)",
                    padding: "6px 14px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: categoryFilter === c.key ? 700 : 500,
                    cursor: "pointer",
                    transition: "all .15s ease",
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Visual Provider Cards Grid - Compact & Sleek */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
                marginBottom: 18,
              }}
            >
              {filteredPresetKeys.map((key) => {
                const p = presets[key];
                const isSelected = presetKey === key;
                const icons: Record<string, string> = {
                  openrouter: "🌐",
                  opencode: "💻",
                  pollinations: "🎁",
                  groq: "⚡",
                  deepseek: "🧠",
                  gemini: "✨",
                  openai: "🤖",
                  anthropic: "🏛️",
                  ollama: "🏠",
                  custom: "⚙️",
                };
                const icon = icons[key] || "✦";

                return (
                  <div
                    key={key}
                    className="preset-card"
                    onClick={() => handleSelectPreset(key)}
                    style={{
                      border: isSelected ? "2px solid var(--alpha)" : "1px solid var(--line)",
                      background: isSelected ? "var(--alpha-50)" : "#fff",
                      borderRadius: 12,
                      padding: "10px 12px",
                      cursor: "pointer",
                      transition: "all .15s ease",
                      boxShadow: isSelected ? "0 4px 14px -3px rgba(124,58,237,.25)" : "0 1px 3px rgba(0,0,0,.03)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: 74,
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: isSelected ? "var(--alpha)" : "#f3f0ff",
                          color: isSelected ? "#fff" : "var(--alpha)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                        }}
                      >
                        {icon}
                      </span>
                      {isSelected ? (
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "var(--alpha)",
                            color: "#fff",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          ✓
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: p.keyRequired ? "var(--muted)" : "#16a34a",
                            background: p.keyRequired ? "#f1f5f9" : "#f0fdf4",
                            padding: "1px 6px",
                            borderRadius: 6,
                          }}
                        >
                          {p.keyRequired ? (isAr ? "مفتاح" : "Key") : (isAr ? "مجاني" : "Free")}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 4 }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: isSelected ? "var(--alpha-dark)" : "var(--ink)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={isAr ? p.nameAr : p.name}
                      >
                        {isAr ? p.nameAr : p.name}
                      </span>
                      {(p.badge || p.badgeAr) && isSelected && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: "var(--alpha)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ★
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Preset Information Box */}
          <div
            style={{
              background: "#faf5ff",
              border: "1px solid #e9d5ff",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--alpha-dark)" }}>
                {isAr ? activePreset.nameAr : activePreset.name} — {isAr ? activePreset.tagAr : activePreset.tag}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {isAr ? (activePreset.keyHintAr || activePreset.descAr) : (activePreset.keyHint || activePreset.desc)}
              </div>
            </div>

            {activePreset.keyUrl && (
              <a
                href={activePreset.keyUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--alpha)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "6px 14px",
                  borderRadius: 999,
                  textDecoration: "none",
                }}
              >
                🔑 {t("getKeyBtn")} ↗
              </a>
            )}
          </div>

          {/* Base URL Input */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{t("baseL")}</label>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, baseUrl: activePreset.baseUrl })}
                style={{ background: "none", border: "none", color: "var(--alpha)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
              >
                {isAr ? "استعادة رابط المزود الافتراضي" : "Reset to default URL"}
              </button>
            </div>
            <input
              className="field"
              style={{ direction: "ltr" }}
              placeholder="https://api.example.com/v1"
              value={settings.baseUrl}
              onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
            />
          </div>

          {/* API Key Input */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                {t("keyL")}{" "}
                {!activePreset.keyRequired && (
                  <span style={{ color: "#16a34a", fontSize: 12, fontWeight: 500 }}>
                    ({t("noKeyRequired")})
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{ background: "none", border: "none", color: "var(--alpha)", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
              >
                {showKey ? (isAr ? "إخفاء" : "Hide") : (isAr ? "إظهار" : "Show")}
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showKey ? "text" : "password"}
                className="field"
                style={{ direction: "ltr", paddingRight: 40 }}
                placeholder={activePreset.keyRequired ? "sk-..." : (isAr ? "اختياري — اتركه فارغاً" : "Optional — leave empty")}
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              />
            </div>
          </div>

          {/* Model Name & Quick Selector Chips */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, marginBottom: 6, color: "var(--ink)" }}>
              {t("modelL")}
            </label>
            <input
              className="field"
              list="modelList"
              style={{ direction: "ltr", marginBottom: 8 }}
              placeholder="model-name-here"
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            />
            <datalist id="modelList">
              {(activePreset.models || []).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>

            {/* Quick Model Chips */}
            {activePreset.models && activePreset.models.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  {t("quickModels")}
                </span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {activePreset.models.map((m) => {
                    const isSelectedModel = settings.model === m;
                    const isFreeModel = m.includes(":free");
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSelectModel(m)}
                        style={{
                          border: isSelectedModel ? "1.5px solid var(--alpha)" : "1px solid var(--line)",
                          background: isSelectedModel ? "var(--alpha)" : isFreeModel ? "#f0fdf4" : "#f8fafc",
                          color: isSelectedModel ? "#fff" : isFreeModel ? "#166534" : "var(--ink)",
                          padding: "4px 10px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: isSelectedModel ? 700 : 500,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          transition: "all .15s",
                        }}
                      >
                        {isFreeModel && <span>🎁</span>}
                        <span>{m}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {presetKey === "ollama" && <div className="kv-note" style={{ marginBottom: 18 }}>{t("ollamaNote")}</div>}

          {/* Temperature Slider */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                {t("tempL")}:{" "}
                <span style={{ color: "var(--alpha)", fontWeight: 800 }}>
                  {settings.temperature == null ? 0.7 : settings.temperature}
                </span>
              </label>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {settings.temperature <= 0.3
                  ? (isAr ? "دقيق ومنهجي" : "Precise & Deterministic")
                  : settings.temperature <= 0.8
                  ? (isAr ? "متوازن للدورات التعليمية (موصى به)" : "Balanced & Educational (Recommended)")
                  : (isAr ? "إبداعي ومبتكر" : "Highly Creative")}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={settings.temperature == null ? 0.7 : settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
              style={{ width: "100%", accentColor: "var(--alpha)", cursor: "pointer" }}
            />
          </div>
        </div>

        {/* Extras & Mind Map Section */}
        <div style={{ borderTop: "1px solid var(--line)", marginTop: 20, paddingTop: 18 }}>
          <h3 style={{ fontSize: 17, margin: "0 0 12px", color: "var(--ink)" }}>{t("setExtras")}</h3>
          <div className="toggle-row" style={{ margin: 0 }}>
            <label className="switch">
              <input
                type="checkbox"
                checked={!!settings.mindmap}
                onChange={(e) => setSettings({ ...settings, mindmap: e.target.checked })}
              />
              <span className="knob"></span>
            </label>
            <div>
              <b style={{ fontSize: 15 }}>{t("mindEnable")}</b>
              <br />
              <small style={{ color: "var(--muted)" }}>{t("mindEnableSub")}</small>
            </div>
          </div>
        </div>

        {/* Diagnostics & Result Feedback */}
        {testErrMsg && (
          <div
            className="err"
            style={{
              marginTop: 18,
              padding: "10px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 10,
              fontSize: 14,
            }}
          >
            ⚠️ {testErrMsg}
          </div>
        )}
        {testOkMsg && (
          <div
            style={{
              color: "#15803d",
              fontWeight: 700,
              marginTop: 18,
              padding: "12px 16px",
              background: "#f0fdf4",
              borderRadius: 10,
              border: "1px solid #bbf7d0",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>✅</span>
            <span>{testOkMsg}</span>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn-primary" onClick={handleSave} style={{ minWidth: 160 }}>
            💾 {t("saveSet")}
          </button>
          <button
            className="btn btn-ghost"
            disabled={testing || !settings.enabled}
            onClick={handleTest}
            style={{ minWidth: 160 }}
          >
            {testing ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span className="spin" style={{ display: "inline-block" }}>⚡</span> {t("testing")}
              </span>
            ) : (
              `🔌 ${t("testConn")}`
            )}
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              fontSize: 13,
              cursor: "pointer",
              textDecoration: "underline",
              marginInlineStart: "auto",
              padding: "8px 12px",
            }}
          >
            ↺ {t("resetDefaults")}
          </button>
        </div>

        {/* Security & Local Storage Note */}
        <div className="kv-note" style={{ marginTop: 22, fontSize: 13, lineHeight: 1.5 }}>
          🔒 {t("keysNote")}
        </div>
      </div>
    </div>
  );
};

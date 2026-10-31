"use client";
import { useEffect } from "react";
import { usePreferences, setPreferences } from "@/hooks/use-preferences";
import { themes } from "@/lib/preferences";
const colors = { sage: "#526b52", rose: "#855e68", lavender: "#716282", ochre: "#78683b", blue: "#536f83" };
const names = { sage: ["鼠尾草绿", "Sage"], rose: ["烟粉", "Dusty rose"], lavender: ["雾紫", "Lavender"], ochre: ["麦黄", "Ochre"], blue: ["灰蓝", "Muted blue"] };
export default function AppearanceControls() {
  const { language, theme, failed } = usePreferences();
  const t = (zh: string, en: string) => language === "zh" ? zh : en;
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.lang = language === "zh" ? "zh-CN" : "en"; document.title = language === "zh" ? "LUMI · 读懂文字背后的世界" : "LUMI · Read beyond the words."; }, [language, theme]);
  return <div className="appearance-strip"><div className="theme-controls" role="group" aria-label={t("主题配色", "Theme colors")}><span>{t("配色", "Theme")}</span>{themes.map(id => <button key={id} className="theme-swatch" style={{ background: colors[id] }} aria-label={names[id][language === "zh" ? 0 : 1]} title={names[id][language === "zh" ? 0 : 1]} aria-pressed={theme === id} onClick={() => setPreferences({ theme: id })}>{theme === id ? "✓" : ""}</button>)}</div><button className="language-toggle" onClick={() => setPreferences({ language: language === "zh" ? "en" : "zh" })} aria-label={t("切换界面为英文", "Switch interface to Chinese")}>{language === "zh" ? "English" : "中文"}</button>{failed && <span className="preferences-warning" role="status">{t("偏好仅在本次页面有效", "Preferences could not be saved")}</span>}</div>;
}

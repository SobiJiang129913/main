"use client";
import { uiText } from "@/lib/ui-text";
import { useCallback, useSyncExternalStore } from "react";
import { defaultPreferences, parsePreferences, PREFERENCES_KEY, type Preferences } from "@/lib/preferences";
let snapshot = { ...defaultPreferences, failed: false };
const server = snapshot;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(fn => fn());
function load() { try { snapshot = { ...parsePreferences(localStorage.getItem(PREFERENCES_KEY)), failed: false }; } catch { snapshot = { ...snapshot, failed: true }; } }
function onStorage(e: StorageEvent) { if (e.key === PREFERENCES_KEY || e.key === null) { load(); emit(); } }
function subscribe(fn: () => void) {
  listeners.add(fn);
  if (!loaded) { loaded = true; load(); emit(); }
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); if (!listeners.size) window.removeEventListener("storage", onStorage); };
}
export function setPreferences(change: Partial<Preferences>) {
  snapshot = { ...snapshot, ...change };
  try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ language: snapshot.language, theme: snapshot.theme })); snapshot = { ...snapshot, failed: false }; }
  catch { snapshot = { ...snapshot, failed: true }; }
  emit();
}
export function usePreferences() { return useSyncExternalStore(subscribe, () => snapshot, () => server); }
export function useText() { const { language } = usePreferences(); return useCallback((zh: string, en: string) => language === "zh" ? zh : en, [language]); }

export function useUI() { const { language } = usePreferences(); return useCallback((text: string) => uiText(text, language), [language]); }

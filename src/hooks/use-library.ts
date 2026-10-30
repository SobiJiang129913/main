"use client";

import { useSyncExternalStore } from "react";
import { emptyLibrary, parseLibrary, STORAGE_KEY, type Library } from "@/lib/library";

type Snapshot = { library: Library; ready: boolean; warning: string; blocked: boolean };
const server: Snapshot = { library: emptyLibrary(), ready: false, warning: "", blocked: false };
let snapshot = server;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    snapshot = { library: raw ? parseLibrary(raw) : emptyLibrary(), ready: true, warning: "", blocked: false };
  } catch {
    snapshot = { ...snapshot, ready: true, warning: "无法读取本地记录（可能数据损坏或浏览器禁止存储）。原数据未覆盖；本次更改仅临时保留，请导出备份。", blocked: true };
  }
  loaded = true;
}
function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY || event.key === null) { load(); emit(); }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) { load(); emit(); }
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener("storage", onStorage); };
}
export function changeLibrary(change: (library: Library) => Library) {
  try {
    const next = change(snapshot.library);
    let warning = snapshot.warning;
    if (!snapshot.blocked) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); warning = ""; }
      catch { warning = "本地保存失败：存储空间已满或浏览器禁止存储。本次更改仅临时保留，刷新前请导出备份。"; }
    }
    snapshot = { ...snapshot, library: next, warning };
    emit();
    return true;
  } catch (error) {
    snapshot = { ...snapshot, warning: error instanceof Error ? error.message : "暂时无法更新记录。" };
    emit(); return false;
  }
}
export function useLibrary() {
  return useSyncExternalStore(subscribe, () => snapshot, () => server);
}

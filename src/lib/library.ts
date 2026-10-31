export const STORAGE_KEY = "lumi.library.v1";
export const MAX_ARTICLES = 40;
export type Selection = { id: string; kind: "word" | "sentence"; text: string; context: string };
export type Study = { meaning: string; example: string; translation: string; analysis: string; source: "ai" | "manual"; updatedAt: string };
export type Discovery = Selection & { note: string; folderId?: string | null; study?: Study };
export type Folder = { id: string; name: string };
export type Progress = { paragraph: number; completed: boolean; mode: "word" | "sentence"; size: number };
export type ReadingRecord = { id: string; title: string; text: string; updatedAt: string; progress: Progress; discoveries: Discovery[] };
export type Library = { version: 1; draft: string; activeId: string | null; view: "home" | "reader" | "library" | "favorites"; articles: ReadingRecord[]; folders?: Folder[]; focusId?: string | null };
export const emptyLibrary = (): Library => ({ version: 1, draft: "", activeId: null, view: "home", articles: [] });
const object = (x: unknown): x is Record<string, unknown> => Boolean(x) && typeof x === "object" && !Array.isArray(x);
const string = (x: unknown, max: number) => typeof x === "string" && x.length <= max;

export function parseLibrary(raw: string): Library {
  const v: unknown = JSON.parse(raw);
  if (!object(v) || v.version !== 1 || !string(v.draft, 30000) || !(typeof v.view === "string" && ["home", "reader", "library", "favorites"].includes(v.view)) || !Array.isArray(v.articles) || v.articles.length > MAX_ARTICLES || !(v.activeId === null || string(v.activeId, 100))) throw new Error("Invalid library");
  if (v.folders !== undefined && (!Array.isArray(v.folders) || v.folders.length > 30 || v.folders.some(f => !object(f) || typeof f.id !== "string" || !f.id || f.id.length > 100 || typeof f.name !== "string" || !f.name.trim() || f.name.length > 50) || new Set(v.folders.map(f => f.id)).size !== v.folders.length)) throw new Error("Invalid folders");
  if (v.focusId !== undefined && v.focusId !== null && (typeof v.focusId !== "string" || !/^p\d+-s\d+(?:-w\d+)?$/.test(v.focusId))) throw new Error("Invalid focus");
  const folderIds = new Set((v.folders as Folder[] | undefined)?.map(f => f.id) || []);
  const ids = new Set<string>();
  for (const a of v.articles) {
    if (!object(a) || typeof a.id !== "string" || !a.id || a.id.length > 100 || ids.has(a.id) || !string(a.title, 100) || typeof a.text !== "string" || !a.text.trim() || a.text.length > 30000 || typeof a.updatedAt !== "string" || !Number.isFinite(Date.parse(a.updatedAt)) || !object(a.progress) || !Array.isArray(a.discoveries) || a.discoveries.length > 200) throw new Error("Invalid article");
    ids.add(a.id);
    const p = a.progress;
    if (!Number.isInteger(p.paragraph) || Number(p.paragraph) < 0 || Number(p.paragraph) >= a.text.split(/\n\s*\n/).length || typeof p.completed !== "boolean" || !(typeof p.mode === "string" && ["word", "sentence"].includes(p.mode)) || ![18,20,22,24,26].includes(Number(p.size)) || typeof p.size !== "number") throw new Error("Invalid progress");
    const bookmarks = new Set<string>();
    for (const d of a.discoveries) {
      if (!object(d) || typeof d.id !== "string" || !/^p\d+-s\d+(?:-w\d+)?$/.test(d.id) || bookmarks.has(d.id) || !(typeof d.kind === "string" && ["word", "sentence"].includes(d.kind)) || typeof d.text !== "string" || !d.text || d.text.length > 30000 || typeof d.context !== "string" || !a.text.includes(d.context) || !d.context.includes(d.text) || !string(d.note, 2000)) throw new Error("Invalid discovery");
      if (d.folderId !== undefined && d.folderId !== null && (typeof d.folderId !== "string" || !folderIds.has(d.folderId))) throw new Error("Missing folder");
      if (d.study !== undefined && (!object(d.study) || !["meaning", "example", "translation", "analysis"].every(k => string((d.study as Record<string,unknown>)[k],6000)) || !(typeof d.study.source === "string" && ["ai", "manual"].includes(d.study.source)) || typeof d.study.updatedAt !== "string" || !Number.isFinite(Date.parse(d.study.updatedAt)))) throw new Error("Invalid study");
      bookmarks.add(d.id);
    }
  }
  if (v.activeId !== null && !ids.has(String(v.activeId))) throw new Error("Missing active article");
  if (v.view === "reader" && v.activeId === null) throw new Error("Missing reader article");
  return v as unknown as Library;
}

export function beginReading(library: Library, text: string, id: string, now: string): Library {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 30000) throw new Error("请粘贴 30,000 字符以内的文章。");
  const existing = library.articles.find(a => a.text === trimmed);
  if (!existing && library.articles.length >= MAX_ARTICLES) throw new Error("历史记录已达 40 篇，请先导出备份并删除不需要的文章。");
  const record: ReadingRecord = existing ? { ...existing, updatedAt: now } : {
    id, text: trimmed, title: trimmed.split(/\n/)[0].slice(0, 80), updatedAt: now,
    progress: { paragraph: 0, completed: false, mode: "word", size: 20 }, discoveries: [],
  };
  return { ...library, draft: text, activeId: record.id, focusId: null, view: "reader", articles: [record, ...library.articles.filter(a => a.id !== record.id)] };
}
export function updateRecord(library: Library, id: string, change: (record: ReadingRecord) => ReadingRecord): Library {
  return { ...library, articles: library.articles.map(a => a.id === id ? change(a) : a) };
}
export function deleteRecord(library: Library, id: string): Library {
  const deleting = library.articles.find(a => a.id === id);
  return { ...library, articles: library.articles.filter(a => a.id !== id), activeId: library.activeId === id ? null : library.activeId, draft: library.activeId === id && library.draft.trim() === deleting?.text ? "" : library.draft, view: library.activeId === id && library.view === "reader" ? "library" : library.view };
}
export function toggleDiscovery(record: ReadingRecord, selection: Selection): ReadingRecord {
  if (record.discoveries.some(d => d.id === selection.id)) return { ...record, discoveries: record.discoveries.filter(d => d.id !== selection.id) };
  if (record.discoveries.length >= 200) throw new Error("每篇最多收藏 200 项，请先整理收藏。");
  return { ...record, discoveries: [...record.discoveries, { ...selection, note: "" }] };
}
export function exportLibrary(library: Library) {
  return JSON.stringify({ app: "LUMI", exportedAt: new Date().toISOString(), library }, null, 2);
}

export function openDiscovery(library: Library, articleId: string, selection: Discovery): Library {
  const paragraph = Number(selection.id.match(/^p(\d+)/)?.[1] || 0);
  return { ...updateRecord(library, articleId, a => ({ ...a, updatedAt: new Date().toISOString(), progress: { ...a.progress, paragraph, mode: selection.kind } })), activeId: articleId, focusId: selection.id, view: "reader" };
}
export function addFolder(library: Library, name: string, id: string): Library {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 50) throw new Error("收藏夹名称需为 1–50 个字符。");
  if ((library.folders || []).some(f => f.name.toLowerCase() === trimmed.toLowerCase())) throw new Error("已存在同名收藏夹。");
  if ((library.folders || []).length >= 30) throw new Error("最多创建 30 个收藏夹。");
  return { ...library, folders: [...(library.folders || []), { id, name: trimmed }] };
}
export function removeFolder(library: Library, id: string): Library {
  return { ...library, folders: (library.folders || []).filter(f => f.id !== id), articles: library.articles.map(a => ({ ...a, discoveries: a.discoveries.map(d => d.folderId === id ? { ...d, folderId: null } : d) })) };
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { beginReading, deleteRecord, emptyLibrary, exportLibrary, parseLibrary, toggleDiscovery, updateRecord, type Library } from "../src/lib/library";
const now = "2026-10-30T08:00:00.000Z";
const text = "A quiet moment.\n\nPay attention to this sentence.";
const selection = { id: "p1-s0-w4", kind: "word" as const, text: "attention", context: "Pay attention to this sentence." };
const base = () => beginReading(emptyLibrary(), text, "article-a", now);

test("creates and resumes exact articles without duplicates or lost notes/progress", () => {
  let library = base();
  library = updateRecord(library, "article-a", a => ({ ...toggleDiscovery(a, selection), progress: { paragraph: 1, completed: true, mode: "sentence", size: 24 } }));
  library = updateRecord(library, "article-a", a => ({ ...a, discoveries: a.discoveries.map(d => ({ ...d, note: "我的理解" })) }));
  const resumed = beginReading(library, ` ${text} `, "unused-id", now);
  assert.equal(resumed.articles.length, 1); assert.equal(resumed.activeId, "article-a");
  assert.equal(resumed.articles[0].progress.paragraph, 1); assert.equal(resumed.articles[0].discoveries[0].note, "我的理解");
  assert.deepEqual(parseLibrary(JSON.stringify(resumed)), resumed);
});
test("edited content creates separate history and leaves the original intact", () => {
  const library = beginReading(base(), text + " New ending.", "article-b", now);
  assert.equal(library.articles.length, 2); assert.equal(library.articles[1].text, text);
});
test("removing an article removes its data but preserves unrelated articles and drafts", () => {
  const two = beginReading(base(), "Another article.", "article-b", now);
  const removed = deleteRecord(two, "article-a"); assert.equal(removed.articles.length, 1); assert.equal(removed.activeId, "article-b");
  const activeRemoved = deleteRecord(two, "article-b"); assert.equal(activeRemoved.activeId, null); assert.equal(activeRemoved.view, "library"); assert.equal(activeRemoved.draft, "");
  assert.equal(deleteRecord({ ...two, draft: "Unfinished new draft" }, "article-b").draft, "Unfinished new draft");
});
test("supports toggling discoveries and removes notes with the discovery", () => {
  const a = base().articles[0]; const added = toggleDiscovery(a, selection);
  assert.equal(added.discoveries.length, 1); assert.equal(added.discoveries[0].note, "");
  assert.equal(toggleDiscovery(added, selection).discoveries.length, 0);
});
test("rejects damaged storage, unknown versions, invalid notes and references", () => {
  const library = base();
  const invalid: unknown[] = [{ ...library, version: 99 }, { ...library, view: ["reader"] }, { ...library, activeId: "missing" }, { ...library, articles: [library.articles[0], library.articles[0]] }, { ...library, articles: [{ ...library.articles[0], progress: { ...library.articles[0].progress, paragraph: 99 } }] }, { ...library, articles: [{ ...library.articles[0], discoveries: [{ ...selection, note: "x".repeat(2001) }] }] }];
  for (const bad of invalid) assert.throws(() => parseLibrary(JSON.stringify(bad)));
  assert.throws(() => parseLibrary("{broken")); assert.deepEqual(parseLibrary(JSON.stringify(emptyLibrary())), emptyLibrary());
});
test("enforces limits without silently pruning existing records", () => {
  let library: Library = emptyLibrary();
  for (let i=0;i<40;i++) library=beginReading(library,`Article ${i}`,String(i),now);
  assert.throws(() => beginReading(library,"One too many","extra",now)); assert.equal(library.articles.length,40);
  assert.doesNotThrow(() => beginReading(library,"Article 1","ignored",now));
  assert.throws(() => beginReading(library," ","empty",now));
});
test("export preserves complete readable article, progress, discoveries and notes", () => {
  const library=updateRecord(base(),"article-a",a=>toggleDiscovery(a,selection));
  const backup=JSON.parse(exportLibrary(library)); assert.equal(backup.app,"LUMI");
  assert.deepEqual(backup.library,library); assert.ok(Number.isFinite(Date.parse(backup.exportedAt)));
});

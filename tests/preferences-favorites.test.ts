import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultPreferences, parsePreferences, themes } from '../src/lib/preferences';
import { uiText } from '../src/lib/ui-text';
import { addFolder, beginReading, emptyLibrary, openDiscovery, parseLibrary, removeFolder, toggleDiscovery, updateRecord } from '../src/lib/library';
const selection={id:'p1-s0-w0',kind:'word' as const,text:'Attention',context:'Attention matters.'};
function saved(){const l=beginReading(emptyLibrary(),'A title\n\nAttention matters.','article','2026-10-31T08:00:00Z');return updateRecord(l,'article',a=>toggleDiscovery(a,selection));}
test('preferences validate every palette and safely default damaged settings',()=>{
 for(const theme of themes)assert.deepEqual(parsePreferences(JSON.stringify({language:'en',theme})),{language:'en',theme});
 for(const value of [null,'bad json','{}',JSON.stringify({theme:'neon',language:'bad'})])assert.deepEqual(parsePreferences(value),defaultPreferences);
});
test('UI translations are reversible and leave unknown article content alone',()=>{
 assert.equal(uiText('阅读书架','en'),'Reading library');assert.equal(uiText('Start Reading','zh'),'开始阅读');
 const article='A story about unfamiliar ideas.';assert.equal(uiText(article,'en'),article);assert.equal(uiText(article,'zh'),article);
});
test('folders organize old favorites and removal preserves all selections and notes',()=>{
 let l=addFolder(saved(),'Science','folder-a');l=updateRecord(l,'article',a=>({...a,discoveries:a.discoveries.map(d=>({...d,folderId:'folder-a',note:'Personal note'}))}));
 assert.deepEqual(parseLibrary(JSON.stringify(l)),l);const removed=removeFolder(l,'folder-a');assert.equal(removed.articles[0].discoveries[0].note,'Personal note');assert.equal(removed.articles[0].discoveries[0].folderId,null);assert.equal(removed.folders?.length,0);
 assert.throws(()=>addFolder(l,'science','folder-b'));assert.throws(()=>addFolder(l,'','empty'));
});
test('old version-one data still loads; study details survive save and export shapes',()=>{
 const l=saved();assert.deepEqual(parseLibrary(JSON.stringify(l)),l);
 const enriched=updateRecord(l,'article',a=>({...a,discoveries:a.discoveries.map(d=>({...d,study:{meaning:'注意力',example:'Pay attention.',translation:'',analysis:'名词。',source:'ai',updatedAt:'2026-10-31T08:00:00Z'}}))}));
 assert.deepEqual(parseLibrary(JSON.stringify(enriched)),enriched);
 assert.throws(()=>parseLibrary(JSON.stringify({...l,folders:[{id:'same',name:'A'},{id:'same',name:'B'}]})));
});
test('returning to source restores the correct article, mode and paragraph',()=>{
 const l=saved();const next=openDiscovery(l,'article',l.articles[0].discoveries[0]);assert.equal(next.view,'reader');assert.equal(next.focusId,selection.id);assert.equal(next.activeId,'article');assert.equal(next.articles[0].progress.paragraph,1);assert.equal(next.articles[0].progress.mode,'word');assert.deepEqual(parseLibrary(JSON.stringify(next)),next);
});

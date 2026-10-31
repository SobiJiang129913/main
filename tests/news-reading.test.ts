import { test } from "node:test";
import assert from "node:assert/strict";
import { newsReadingText } from "../src/lib/news-reading";
import { beginReading, emptyLibrary } from "../src/lib/library";
const item={id:'news',sourceId:'bbc',source:'BBC News',title:'A new discovery',summary:'A summary worth reading.',url:'https://www.bbc.com/news/a',publishedAt:null,imageUrl:null,imageCredit:null};
test('one-click summary preserves scope, publisher and original link in history',()=>{
 const text=newsReadingText(item);assert.match(text,/RSS 摘要 · 非全文/);assert.ok(text.includes(item.summary));assert.ok(text.includes(item.url));
 const first=beginReading(emptyLibrary(),text,'one',new Date().toISOString());const again=beginReading(first,text,'two',new Date().toISOString());assert.equal(again.articles.length,1);
});
test('an absent summary cannot be misrepresented as a full readable article',()=>{
 assert.throws(()=>newsReadingText({...item,summary:'  '}));
});

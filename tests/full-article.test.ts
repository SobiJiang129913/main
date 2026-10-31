import { test } from 'node:test';
import assert from 'node:assert/strict';
import { englishWordCount, fetchFullArticle, guardianArticlePath, FullArticleError } from '../src/lib/full-article';
import { POST } from '../src/app/api/full-article/route';
const url='https://www.theguardian.com/world/2026/oct/31/example-story';
const fixture=(bodyText='A complete story.\n\nA second paragraph.')=>({response:{status:'ok',content:{type:'article',webTitle:'A reported story',webUrl:url,fields:{bodyText,byline:'A reporter'}}}});
test('validates publisher links without allowing arbitrary fetch destinations',()=>{
 assert.equal(guardianArticlePath(url+'?tracking=1'),'world/2026/oct/31/example-story');
 for(const bad of ['https://evil.test/a/b/c','https://www.theguardian.com.evil.test/a/b/c','http://www.theguardian.com/a/b/c','https://user:pass@www.theguardian.com/a/b/c','https://www.theguardian.com/%2e%2e/x/y']) assert.throws(()=>guardianArticlePath(bad));
});
test('missing key is reported before any external request',async()=>{
 await assert.rejects(fetchFullArticle(url,undefined,async()=>{throw new Error('must not fetch')}),e=>e instanceof FullArticleError&&e.code==='NOT_CONFIGURED');
});
test('uses official full body, keeps paragraphs, attribution and metadata',async()=>{
 const result=await fetchFullArticle(url,'unit-test-key',async(input,options)=>{
  const endpoint=new URL(String(input));assert.equal(endpoint.hostname,'content.guardianapis.com');assert.equal(endpoint.searchParams.get('show-fields'),'bodyText,byline');assert.equal(options?.cache,'no-store');assert.equal(options?.redirect,'error');return Response.json(fixture());
 });
 assert.equal(result.wordCount,6);assert.match(result.body,/\n\n/);assert.match(result.readingText,/全文 · The Guardian/);assert.ok(result.readingText.includes(url));assert.ok(!result.readingText.includes('unit-test-key'));
});
test('accepts 3000 body words but does not silently truncate longer articles',async()=>{
 const accepted=await fetchFullArticle(url,'test',async()=>Response.json(fixture('word '.repeat(3000))));assert.equal(accepted.wordCount,3000);
 await assert.rejects(fetchFullArticle(url,'test',async()=>Response.json(fixture('word '.repeat(3001)))),e=>e instanceof FullArticleError&&e.code==='TOO_LONG');
 assert.equal(englishWordCount("Read slowly. Pay attention!"),4);
});
test('rejects summary-only, wrong-link and non-article replies',async()=>{
 const summaryOnly={response:{status:'ok',content:{type:'article',webTitle:'Title',webUrl:url,fields:{trailText:'Just a summary'}}}};
 for(const data of [summaryOnly,{response:{...fixture().response,content:{...fixture().response.content,type:'liveblog'}}},{response:{...fixture().response,content:{...fixture().response.content,webUrl:url+'-different'}}}]) await assert.rejects(fetchFullArticle(url,'test',async()=>Response.json(data)),FullArticleError);
});
test('maps connection, quota and auth failures without exposing key or provider details',async()=>{
 for(const status of [401,403,429,500]) await assert.rejects(fetchFullArticle(url,'test-secret',async()=>Response.json({error:'private upstream details'},{status})),e=>e instanceof FullArticleError&&!e.message.includes('test-secret')&&!e.message.includes('private upstream'));
 await assert.rejects(fetchFullArticle(url,'test',async()=>{throw new Error('network')}),e=>e instanceof FullArticleError&&e.code==='CONNECTION');
});
test('route rejects cross-origin, malformed and oversized requests',async()=>{
 const request=(body:string,headers={})=>new Request('https://lumi.test/api/full-article',{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
 assert.equal((await POST(request(JSON.stringify({url}),{origin:'https://other.test'}))).status,403);
 assert.equal((await POST(request('{'))).status,400);assert.equal((await POST(request('x'.repeat(2049)))).status,413);
});

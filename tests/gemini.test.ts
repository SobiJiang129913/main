import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateGeminiNote, GeminiNoteError } from '../src/lib/gemini-note';
import { POST } from '../src/app/api/explain/route';
const note={meaning:'专注',explanation:'语境说明',example:'Pay attention.',question:'你注意到了什么？'};
const input={kind:'word' as const,text:'attention',context:'Pay attention.'};
const signal=new AbortController().signal;
const wire=(text=JSON.stringify(note),finishReason='STOP')=>Response.json({candidates:[{finishReason,content:{parts:[{text}]}}]});
const fetchOriginal=globalThis.fetch;
const names=['LUMI_AI_PROVIDER','LUMI_AI_ENABLED','LUMI_GEMINI_MODEL','LUMI_GEMINI_API_KEY'];
const original=names.map(name=>process.env[name]);
afterEach(()=>{globalThis.fetch=fetchOriginal;names.forEach((name,i)=>{if(original[i]===undefined)delete process.env[name];else process.env[name]=original[i]})});
test('Gemini uses a fixed endpoint, server-only key header and structured schema',async()=>{
 const result=await generateGeminiNote(input,'test-only-key','models/test-text-model',signal,async(url,options)=>{
  assert.equal(String(url),'https://generativelanguage.googleapis.com/v1beta/models/test-text-model:generateContent');assert.ok(!String(url).includes('test-only-key'));
  assert.equal(new Headers(options?.headers).get('x-goog-api-key'),'test-only-key');assert.equal(options?.redirect,'error');
  const body=JSON.parse(String(options?.body));assert.equal(body.generationConfig.responseMimeType,'application/json');assert.deepEqual(JSON.parse(body.contents[0].parts[0].text),input);
  return wire();
 });assert.deepEqual(result,note);
});
test('model configuration cannot redirect requests or use arbitrary URLs',async()=>{
 for(const id of ['', 'https://evil.test/model','../../evil','model?key=x']) await assert.rejects(generateGeminiNote(input,'test',id,signal,async()=>{throw new Error('must not fetch')}),e=>e instanceof GeminiNoteError&&e.code==='MODEL_CONFIG');
});
test('Gemini auth, quota, model and server errors never expose upstream detail',async()=>{
 for(const [status,expected] of [[401,503],[403,503],[429,429],[404,503],[400,503],[500,502]])await assert.rejects(generateGeminiNote(input,'private-key','test-model',signal,async()=>Response.json({error:'private detail'},{status})),e=>e instanceof GeminiNoteError&&e.status===expected&&!e.message.includes('private'));
});
test('rejects incomplete or invalid responses and ignores thought parts',async()=>{
 for(const response of [wire('{}','MAX_TOKENS'),wire('not-json'),wire('{}'),Response.json({promptFeedback:{blockReason:'SAFETY'}})])await assert.rejects(generateGeminiNote(input,'test','test-model',signal,async()=>response),GeminiNoteError);
 const result=await generateGeminiNote(input,'test','test-model',signal,async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'private reasoning'},{text:JSON.stringify(note)}]}}]}));assert.deepEqual(result,note);
});
test('route selects Gemini and never falls back to OpenAI',async()=>{
 process.env.LUMI_AI_PROVIDER='gemini';process.env.LUMI_AI_ENABLED='true';process.env.LUMI_GEMINI_MODEL='test-model';process.env.LUMI_GEMINI_API_KEY='test-only';let calls=0;
 globalThis.fetch=async(url)=>{calls++;assert.match(String(url),/^https:\/\/generativelanguage.googleapis.com\//);return wire()};
 const request=()=>new Request('https://lumi.test/api/explain',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});
 assert.deepEqual((await(await POST(request())).json()).explanation,note);assert.equal(calls,1);
 delete process.env.LUMI_GEMINI_MODEL;assert.equal((await(await POST(request())).json()).code,'MODEL_CONFIG');assert.equal(calls,1);
 process.env.LUMI_GEMINI_MODEL='test-model';delete process.env.LUMI_GEMINI_API_KEY;assert.equal((await POST(request())).status,503);assert.equal(calls,1);
});

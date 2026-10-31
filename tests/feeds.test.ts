import { test } from "node:test";
import assert from "node:assert/strict";
import { createFeedService, feedSources, parseFeed, publisherURL } from "../src/lib/feeds";
const rss=(host:string)=>`<?xml version="1.0"?><rss version="2.0"><channel><title>News</title><item><title>One &amp; two</title><link>https://${host}/news/story</link><description><![CDATA[<p>A public summary.</p>]]></description><pubDate>Fri, 30 Oct 2026 08:00:00 GMT</pubDate></item></channel></rss>`;
test("parses RSS summaries, entities, publication dates and single items",()=>{
  const items=parseFeed(rss("www.bbc.com"),feedSources[0]);assert.equal(items.length,1);assert.equal(items[0].title,"One & two");assert.equal(items[0].summary,"A public summary.");assert.equal(items[0].publishedAt,"2026-10-30T08:00:00.000Z");
});
test("rejects unsafe links, external hosts, credentials, DTD and malformed XML",()=>{
  for(const url of ["javascript:alert(1)","http://bbc.com/news","https://bbc.com.evil.test/news","https://user:pass@bbc.com/news","https://bbc.com:8443/news"] ) assert.equal(publisherURL(url,feedSources[0]),null);
  assert.equal(parseFeed(rss("evil.test"),feedSources[0]).length,0);
  assert.throws(()=>parseFeed('<!DOCTYPE rss [<!ENTITY x "data">]><rss/>',feedSources[0]));assert.throws(()=>parseFeed('<rss><unclosed>',feedSources[0]));
});
test("deduplicates, bounds result count and preserves missing dates as unknown",()=>{
  const item='<item><title>Headline</title><link>https://www.bbc.com/news/a</link></item>';
  const items=parseFeed(`<rss><channel>${item.repeat(4)}</channel></rss>`,feedSources[0]);assert.equal(items.length,1);assert.equal(items[0].publishedAt,null);
});
test("fetches fixed sources in parallel, shares in-flight work and caches successes",async()=>{
  let calls=0;let now=1000000000;
  const fetcher:typeof fetch=async(url)=>{calls++;return new Response(rss(String(url).includes("bbci")?"www.bbc.com":"www.theguardian.com"));};
  const service=createFeedService(fetcher,()=>now);const [a,b]=await Promise.all([service(),service()]);assert.deepEqual(a,b);assert.equal(calls,2);assert.equal(a.items.length,2);assert.ok(a.sources.every(s=>s.status==='ok'));
  now+=1000;await service();assert.equal(calls,2);
});
test("reports partial failures and stale data without pretending it is fresh",async()=>{
  let now=1000000000;let fail=false;
  const fetcher:typeof fetch=async(url)=>{if(fail||String(url).includes('theguardian'))return new Response('no',{status:503});return new Response(rss('www.bbc.com'));};
  const service=createFeedService(fetcher,()=>now);const first=await service();assert.equal(first.sources[0].status,'ok');assert.equal(first.sources[1].status,'unavailable');
  fail=true;now+=1800001;const stale=await service();assert.equal(stale.sources[0].status,'stale');assert.equal(stale.sources[0].fetchedAt,first.sources[0].fetchedAt);assert.equal(stale.items.length,1);
});
test("returns unavailable for all failed or oversized feeds",async()=>{
  const service=createFeedService(async()=>new Response('x'.repeat(1000001)));const result=await service();assert.equal(result.items.length,0);assert.ok(result.sources.every(s=>s.status==='unavailable'));
});

test("extracts BBC thumbnails and Guardian media images with credit",()=>{
  const bbc='<rss xmlns:media="http://search.yahoo.com/mrss/"><channel><item><title>Photo story</title><link>https://www.bbc.com/news/a</link><media:thumbnail url="https://ichef.bbci.co.uk/news/240/a.jpg" width="240"/><media:thumbnail url="https://ichef.bbci.co.uk/news/640/a.jpg" width="640"/></item></channel></rss>';
  assert.equal(parseFeed(bbc,feedSources[0])[0].imageUrl,'https://ichef.bbci.co.uk/news/640/a.jpg');
  const guardian='<rss xmlns:media="http://search.yahoo.com/mrss/"><channel><item><title>Photo story</title><link>https://www.theguardian.com/world/a</link><media:content url="https://media.guim.co.uk/a.jpg" type="image/jpeg"><media:credit>Photographer / Agency</media:credit></media:content></item></channel></rss>';
  const item=parseFeed(guardian,feedSources[1])[0];assert.equal(item.imageUrl,'https://media.guim.co.uk/a.jpg');assert.equal(item.imageCredit,'Photographer / Agency');
});
test("does not accept arbitrary, insecure or non-image media",()=>{
  for(const [url,type] of [['https://evil.test/a.jpg','image/jpeg'],['http://ichef.bbci.co.uk/a.jpg','image/jpeg'],['https://user:pass@ichef.bbci.co.uk/a.jpg','image/jpeg'],['https://ichef.bbci.co.uk/video.mp4','video/mp4']]) {
    const xml=`<rss xmlns:media="http://search.yahoo.com/mrss/"><channel><item><title>News</title><link>https://www.bbc.com/news/a</link><media:content url="${url}" type="${type}"/></item></channel></rss>`;
    assert.equal(parseFeed(xml,feedSources[0])[0].imageUrl,null);
  }
});

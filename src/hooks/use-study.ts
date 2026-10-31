"use client";
import { useSyncExternalStore } from "react";
import { changeLibrary } from "@/hooks/use-library";
import { updateRecord, type Discovery, type Study } from "@/lib/library";
import { isExplanation } from "@/lib/explanation";
import { useUI } from "@/hooks/use-preferences";
type Status = { loading: boolean; error: string };
const empty: Status = { loading: false, error: "" };
const states = new Map<string, Status>();
const listeners = new Set<() => void>();
const keyFor = (articleId: string, id: string) => `${articleId}:${id}`;
const emit = () => listeners.forEach(fn=>fn());
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export async function generateStudy(articleId: string, selection: Discovery) {
  const key=keyFor(articleId,selection.id);
  if(states.get(key)?.loading) return;
  states.set(key,{loading:true,error:""});emit();
  try {
    const response=await fetch('/api/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:selection.kind,text:selection.text,context:selection.context}),signal:AbortSignal.timeout(35000)});
    const body=await response.json();
    if(!response.ok) throw new Error(typeof body?.error==='string'?body.error:'AI 解释暂时不可用，请重试。');
    if(!isExplanation(body?.explanation)) throw new Error('AI 解释内容不完整，请重试。');
    const result=body.explanation;
    const study:Study={meaning:selection.kind==='word'?result.meaning:'',example:result.example,translation:selection.kind==='sentence'?result.meaning:'',analysis:result.explanation,source:'ai',updatedAt:new Date().toISOString()};
    changeLibrary(l=>updateRecord(l,articleId,a=>({...a,discoveries:a.discoveries.map(d=>d.id===selection.id&&!d.study?{...d,study}:d)})));
    states.set(key,empty);
  }catch(error){states.set(key,{loading:false,error:error instanceof Error && ['TimeoutError','AbortError'].includes(error.name) ? '解释请求超时或已取消，请重试。' : error instanceof Error && error.name === 'Error' ? error.message : '网络连接失败，请稍后重试。'});}
  emit();
}
export function useStudy(articleId:string, id:string) {
  const key=keyFor(articleId,id);const status=useSyncExternalStore(subscribe,()=>states.get(key)||empty,()=>empty);const t=useUI();
  return {...status,error:t(status.error)};
}

"use client";

import Image from "next/image";
import { useState } from "react";

export default function NewsImage({ url, source, credit }: { url: string | null; source: string; credit: string | null }) {
  const [failed, setFailed] = useState(false);
  return <figure className="news-image">
    {url && !failed ? <Image src={url} alt={`${source} 为这篇报道提供的配图`} width={640} height={360} unoptimized loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <div className="news-image-placeholder"><span aria-hidden="true">✧</span><span>{url ? "配图暂时无法加载" : "此新闻未提供配图"}</span></div>}
    {url && !failed && <figcaption>配图：{credit || source}</figcaption>}
  </figure>;
}

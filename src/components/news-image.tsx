"use client";
import { useUI } from "@/hooks/use-preferences";

import Image from "next/image";
import { useState } from "react";

export default function NewsImage({ url, source, credit }: { url: string | null; source: string; credit: string | null }) {
  const t = useUI();
  const [failed, setFailed] = useState(false);
  return <figure className="news-image">
    {url && !failed ? <Image src={url} alt={`${source} · ${t("新闻配图")}`} width={640} height={360} unoptimized loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <div className="news-image-placeholder"><span aria-hidden="true">✧</span><span>{url ? t("配图暂时无法加载") : t("此新闻未提供配图")}</span></div>}
    {url && !failed && <figcaption>{t("配图：")}{credit || source}</figcaption>}
  </figure>;
}

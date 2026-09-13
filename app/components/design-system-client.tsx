"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "./site-header";

export function DesignSystemClient({ initialAr, initialKit }: { initialAr: boolean; initialKit: boolean }) {
  const [ar, setAr] = useState(initialAr);
  const [kit, setKit] = useState(initialKit);
  const [height, setHeight] = useState(900);
  useEffect(() => {
    const resize = (event: MessageEvent) => {
      const frame = document.getElementById("design-reference") as HTMLIFrameElement | null;
      if (event.origin === window.location.origin && event.source === frame?.contentWindow && event.data?.type === "design-reference-height" && Number.isFinite(event.data.height)) {
        setHeight(Math.max(400, Math.min(30000, event.data.height)));
      }
    };
    window.addEventListener("message", resize);
    return () => window.removeEventListener("message", resize);
  }, []);
  return <main className="ds-page signals-home" lang={ar ? "ar" : "en"} dir={ar ? "rtl" : "ltr"}>
    <div className="ds-frame">
      <SiteHeader locale={ar ? "ar" : "en"} localeControl={<button className="ds-lang site-language" lang={ar ? "en" : "ar"} onClick={() => setAr(!ar)}>{ar ? "English" : "العربية"}</button>} />
      <nav aria-label={ar ? "نظام التصميم" : "Design system"} className="ds-tabs">
        <button className="ds-tab" aria-current={!kit ? "page" : undefined} onClick={() => setKit(false)}>{ar ? "الإرشادات" : "Guidelines"}</button>
        <button className="ds-tab" aria-current={kit ? "page" : undefined} onClick={() => setKit(true)}>{ar ? "مكتبة الواجهات التفاعلية" : "Interactive UI kit"}</button>
      </nav>
      <iframe id="design-reference" title={kit ? "Interactive UI kit" : "Design system guidelines"} src={kit ? "/design-system/ui_kits/10signals/index.html?embed=1" : "/design-system/design-system.html?embed=1"} style={{ width: "100%", height, border: 0, display: "block" }} />
    </div>
  </main>;
}

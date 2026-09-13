/**
 * The landing explainer from the supplied 10 Signals design: one 14s CSS loop in which
 * five stages accumulate (domain → catalog → competitors → match → report) and reset.
 * Every name and number inside is illustrative sample content, not a customer report.
 */
export function DesignWorkflow({ ar }: { ar: boolean }) {
  const captions = ar
    ? ["أدخل نطاقاً", "فحص الكتالوج العام", "التحقق من المنافسين", "مطابقة المنتجات والأسعار", "تقرير محفوظ قابل للمشاركة"]
    : ["Enter a domain", "Crawl the public catalog", "Verify competitors independently", "Match products and compare prices", "Saved, shareable report"];
  const alt = ar
    ? "نظرة متحركة: يُدخل نطاق، يُفحص الكتالوج، يُتحقق من المنافسين، تُطابق المنتجات والأسعار، ويُنتج تقرير محفوظ."
    : "Animated overview: a domain is entered, its catalog is crawled, competitors are verified, products and prices are matched, and a saved report is produced.";

  return <div className="ms-anim-frame">
    <div className="ms-anim" role="img" aria-label={alt} dir="ltr">
      {/* 1 domain */}
      <div className="ms-domain ms-stage-1">
        <span className="ms-domain-dot" />
        <span className="ms-domain-url">
          {Array.from("lumenandoak.com").map((character, index) => <span
            className="ms-url-character"
            key={index}
            style={{ animationDelay: `${0.95 + index * 0.11}s` }}
          >{character}</span>)}
        </span>
      </div>
      {/* 2 catalog */}
      <div className="ms-catalog ms-stage-2">
        <div className="ms-row"><span className="ms-thumb" /><span className="ms-row-name">Cedar &amp; Smoke 8 oz</span><b className="ms-num">$34</b></div>
        <div className="ms-row"><span className="ms-thumb" /><span className="ms-row-name">Fig Tree Diffuser</span><b className="ms-num">$42</b></div>
        <div className="ms-row"><span className="ms-thumb" /><span className="ms-row-name">Discovery Set</span><b className="ms-num">$38</b></div>
      </div>
      <div aria-hidden="true" className="ms-scan" />
      {/* 3 competitors */}
      <svg aria-hidden="true" width="440" height="360" viewBox="0 0 440 360" className="ms-lines">
        <path d="M160 38 C 230 38, 230 52, 290 52" className="ms-line" />
        <path d="M160 38 C 230 38, 230 88, 290 88" className="ms-line" />
        <path d="M160 38 C 230 38, 230 124, 290 124" className="ms-line" />
        <path d="M202 86 C 250 86, 250 178, 290 178" className="ms-line ms-line-accent" />
      </svg>
      <div className="ms-signal-stream ms-stage-3" aria-hidden="true">
        <span className="ms-signal-packet ms-packet-1" />
        <span className="ms-signal-packet ms-packet-2" />
        <span className="ms-signal-packet ms-packet-3" />
      </div>
      <div className="ms-rivals ms-stage-3">
        <div className="ms-rival">hearthwick.co <b className="ms-rival-ink">● 91</b></div>
        <div className="ms-rival">emberfield.com <b>● 84</b></div>
        <div className="ms-rival">northlight… <b className="ms-rival-inferred">◐ 72</b></div>
      </div>
      {/* 4 match */}
      <div className="ms-match ms-stage-4">
        <div className="ms-row ms-row-match"><span className="ms-thumb" /><span className="ms-row-name">Cedarwood 8 oz</span><b className="ms-num">$29</b></div>
        <div className="ms-verdict">● Same product · rival 14.7% lower</div>
      </div>
      {/* 5 report */}
      <div className="ms-report ms-stage-5">
        <div className="ms-report-head"><span className="ms-complete">● Complete</span><span className="ms-report-meta">4 competitors · 27 comparisons · 19 direct prices</span></div>
        <div className="ms-report-bar"><span className="ms-report-label">Image readiness</span><span className="ms-bar"><span className="ms-bar-fill" /></span><b className="ms-bar-value">92</b></div>
      </div>
      {/* captions */}
      <div className="ms-captions">
        {captions.map((caption, index) => <span key={caption} className={`ms-caption ms-caption-${index + 1}`}>{index + 1} · {caption}</span>)}
      </div>
    </div>
  </div>;
}

"use client";

export type ResearchControlsValue = { closePrice: boolean; tolerance: number; includeAnalysis: boolean };
export const DEFAULT_RESEARCH_CONTROLS: ResearchControlsValue = { closePrice: false, tolerance: 30, includeAnalysis: false };

export function ReportResearchControls({ value, onChange, disabled, ar }: {
  value: ResearchControlsValue; onChange: (value: ResearchControlsValue) => void; disabled: boolean; ar: boolean;
}) {
  return <fieldset className="report-research-controls" disabled={disabled}>
    <legend>{ar ? "خيارات البحث" : "Search options"}</legend>
    <label className="research-check"><input type="checkbox" checked={value.closePrice} onChange={event => onChange({ ...value, closePrice: event.target.checked })} />
      <span>{ar ? "أسعار ضمن نطاق قريب" : "Close price range"}</span></label>
    {value.closePrice && <label className="research-tolerance">{ar ? "النطاق ±" : "Within ±"}
      <input aria-label={ar ? "نسبة تقارب السعر" : "Price tolerance percentage"} type="number" min="1" max="90" step="1" required value={value.tolerance}
        onChange={event => onChange({ ...value, tolerance: event.target.value === "" ? 0 : Number(event.target.value) })} /><span>%</span></label>}
    <label className="research-check"><input type="checkbox" checked={value.includeAnalysis} onChange={event => onChange({ ...value, includeAnalysis: event.target.checked })} />
      <span>{ar ? "تحليل إضافي بالذكاء الاصطناعي" : "Extra AI analysis"}</span></label>
    <p>{value.closePrice
      ? (ar ? "نفس العملة، دون توسيع النطاق تلقائياً. تقارب السعر لا يضمن تطابق الحجم أو الجودة." : "Same currency; the range never widens automatically. Similar price does not guarantee equal size or quality.")
      : (ar ? "بحث واسع افتراضياً. عدد المقارنات تحدده خطتك." : "Broad search by default. Your plan determines the comparison target.")}
      {value.includeAnalysis && <> {ar ? "التحليل الإضافي يزيد الوقت وتكلفة البحث." : "Extra analysis adds research time and cost."}</>}</p>
  </fieldset>;
}

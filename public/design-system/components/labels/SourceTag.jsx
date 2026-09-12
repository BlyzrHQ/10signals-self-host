import React from 'react';
export function SourceTag({ source='rule', labels={ ai:'AI-drafted', rule:'Rule-based' }, style }) {
  const ai = source==='ai';
  return React.createElement('span', { title: ai ? 'Drafted by the AI action planner; review before acting' : 'Deterministic rule from observed values',
    style:{ display:'inline-flex', fontSize:10, letterSpacing:'.06em', textTransform:'uppercase', padding:'2px 7px', borderRadius:'var(--radius-pill)', whiteSpace:'nowrap', background: ai ? 'var(--primary-tint)' : 'transparent', color: ai ? 'var(--primary-deep)' : 'var(--text-body)', border: ai ? '1px solid transparent' : '1px solid var(--border-dashed)', ...style } }, ai ? labels.ai : labels.rule);
}

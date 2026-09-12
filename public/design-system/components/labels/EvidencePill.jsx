import React from 'react';
const STATES = {
  observed:    { glyph:'●', label:'Observed',    style:{ background:'var(--ev-observed-bg)', color:'var(--ev-observed-fg)', border:'1px solid transparent' } },
  inferred:    { glyph:'◐', label:'Inferred',    style:{ background:'var(--ev-inferred-bg)', color:'var(--ev-inferred-fg)', border:'1px solid transparent' } },
  limited:     { glyph:'◔', label:'Limited',     style:{ background:'transparent', color:'var(--ev-limited-fg)', border:'1px dashed var(--ev-limited-border)' } },
  unavailable: { glyph:'○', label:'Unavailable', style:{ background:'transparent', color:'var(--ev-unavailable-fg)', border:'1px solid var(--ev-unavailable-border)' } },
};
export function EvidencePill({ state='observed', children, uppercase=false, style }) {
  const s = STATES[state] || STATES.observed;
  return React.createElement('span', { style:{ display:'inline-flex', alignItems:'center', gap:5, fontSize: uppercase ? 11 : 11, letterSpacing: uppercase ? '.06em' : 0, textTransform: uppercase ? 'uppercase' : 'none', padding:'2px 8px', borderRadius:'var(--radius-pill)', whiteSpace:'nowrap', ...s.style, ...style } },
    React.createElement('span', { 'aria-hidden':true }, s.glyph), children ?? s.label);
}

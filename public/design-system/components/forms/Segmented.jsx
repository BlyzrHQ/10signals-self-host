import React from 'react';
export function Segmented({ options, value, onChange, label }) {
  return React.createElement('span', { role:'group', 'aria-label':label, style:{ display:'inline-flex', border:'1px solid var(--border-strong)', borderRadius:'var(--radius-pill)', overflow:'hidden', background:'var(--surface-raised)' } },
    options.map((o,i) => { const on = o.value===value; return React.createElement('button', { key:o.value, type:'button', 'aria-pressed':on, onClick:()=>onChange(o.value),
      style:{ border:0, borderInlineStart: i? '1px solid var(--border-strong)':0, background: on?'var(--primary-tint)':'transparent', color: on?'var(--primary-deep)':'var(--text-body)', padding:'6px 12px', fontSize:13, cursor:'pointer', fontFamily:'inherit' } }, o.label); }));
}

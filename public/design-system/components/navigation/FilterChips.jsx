import React from 'react';
export function FilterChips({ label, options, value, onChange }) {
  return React.createElement('div', { role:'group', 'aria-label':label, style:{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' } },
    label && React.createElement('span', { style:{ fontSize:11, color:'var(--text-muted)', marginInlineEnd:2 } }, label),
    options.map(o => { const on = o.key===value; return React.createElement('button', { key:o.key, type:'button', 'aria-pressed':on, onClick:()=>onChange(o.key),
      style:{ display:'inline-flex', alignItems:'center', gap:6, border:'1px solid '+(on?'var(--primary)':'var(--border-strong)'), background: on?'var(--primary-tint)':'transparent', color: on?'var(--primary-deep)':'var(--text-body)', padding:'4px 10px', borderRadius:'var(--radius-pill)', fontSize:12, cursor:'pointer', fontFamily:'inherit' } },
      React.createElement('span', { dir:'ltr' }, o.label), o.count!=null && React.createElement('span', { style:{ fontSize:11, color: on?'var(--primary-deep)':'var(--text-faint)', fontVariantNumeric:'tabular-nums' } }, o.count)); }));
}

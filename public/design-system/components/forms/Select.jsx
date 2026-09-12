import React from 'react';
export function Select({ label, options=[], style, wrapStyle, ...rest }) {
  const sel = React.createElement('select', { style:{ ...{ minHeight:'var(--control-h)', padding:'8px 12px', fontSize:14, color:'var(--text)', background:'var(--surface-raised)', border:'1px solid var(--border-strong)', borderRadius:'var(--radius-lg)', fontFamily:'inherit', width:'100%', caretColor:'var(--primary)' }, ...style }, ...rest }, options.map(o => React.createElement('option', { key:o.value, value:o.value }, o.label)));
  return label ? React.createElement('label', { style:{ display:'grid', gap:5, fontSize:12, color:'var(--text-muted)', ...wrapStyle } }, label, sel) : sel;
}

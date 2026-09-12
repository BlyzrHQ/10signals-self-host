import React from 'react';
export function Input({ label, hint, error, ltr=false, style, wrapStyle, ...rest }) {
  const input = React.createElement('input', { dir: ltr?'ltr':undefined, 'aria-invalid': !!error, style:{ ...{ minHeight:'var(--control-h)', padding:'8px 12px', fontSize:14, color:'var(--text)', background:'var(--surface-raised)', border:'1px solid var(--border-strong)', borderRadius:'var(--radius-lg)', fontFamily:'inherit', width:'100%', caretColor:'var(--primary)' }, ...(error?{borderColor:'var(--text-muted)'}:null), ...style }, ...rest });
  if (!label && !hint && !error) return input;
  return React.createElement('label', { style:{ display:'grid', gap:5, fontSize:12, color:'var(--text-muted)', ...wrapStyle } }, label, input,
    error ? React.createElement('span', { role:'alert', style:{ color:'var(--text)' } }, '⚠ '+error) : hint ? React.createElement('span', null, hint) : null);
}

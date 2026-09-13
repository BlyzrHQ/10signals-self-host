import React from 'react';
export function Card({ variant='surface', kicker, title, meta, padding='18px 20px', children, style, as='section', ...rest }) {
  const v = variant==='raised' ? { background:'var(--surface-raised)', border:'1px solid var(--border)' } : variant==='dashed' ? { background:'transparent', border:'1px dashed var(--border-dashed)', borderRadius:'var(--radius-xl)' } : variant==='outline' ? { background:'transparent', boxShadow:'var(--ring)' } : { background:'var(--surface)' };
  return React.createElement(as, { style:{ borderRadius:'var(--radius-lg)', padding, ...v, ...style }, ...rest },
    kicker && React.createElement('p', { style:{ margin:'0 0 4px', fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--text-muted)' } }, kicker),
    title && React.createElement('h3', { style:{ margin:'0 0 6px', fontSize:17, fontWeight:600 } }, title),
    children,
    meta && React.createElement('p', { style:{ margin:'8px 0 0', fontSize:11, color:'var(--text-faint)' } }, meta));
}

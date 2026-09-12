import React from 'react';
const UP = React.createElement('svg', { width:14, height:14, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round' }, React.createElement('path', { d:'M7 10v11M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.2 7A2 2 0 0 1 17.6 21H7V10l4.4-7.2A1.3 1.3 0 0 1 13.7 3c.9.3 1.5 1.2 1.3 2.9Z' }));
const DOWN = React.createElement('svg', { width:14, height:14, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round' }, React.createElement('path', { d:'M17 14V3M9 18.1 10 14H4.2a2 2 0 0 1-1.9-2.6l2.2-7A2 2 0 0 1 6.4 3H17v11l-4.4 7.2a1.3 1.3 0 0 1-2.3-.2c-.9-.3-1.5-1.2-1.3-2.9Z' }));
function Thumb({ on, label, icon, onClick, size }) {
  const [hover, setHover] = React.useState(false);
  return React.createElement('button', { type:'button', 'aria-pressed':on, 'aria-label':label, title:label, onClick, onMouseEnter:()=>setHover(true), onMouseLeave:()=>setHover(false),
    style:{ width:size, height:size, border:0, borderRadius:'var(--radius-pill)', background: on ? 'var(--primary-tint)' : hover ? 'var(--hover-wash)' : 'transparent', color: on ? 'var(--primary)' : hover ? 'var(--text)' : 'var(--ink-300)', cursor:'pointer', display:'grid', placeItems:'center' } }, icon);
}
export function FeedbackThumbs({ value, onChange, size=26, labels={ group:'Useful?', up:'Good comparison', down:'Wrong or unhelpful comparison' } }) {
  const [localValue, setLocalValue] = React.useState(null);
  const inner = value === undefined ? localValue : value;
  const set = (v) => { const next = inner===v ? null : v; if (value === undefined) setLocalValue(next); onChange?.(next); };
  return React.createElement('span', { role:'group', 'aria-label':labels.group, style:{ display:'inline-flex', gap:2 } },
    React.createElement(Thumb, { on:inner==='up', label:labels.up, icon:UP, onClick:()=>set('up'), size }),
    React.createElement(Thumb, { on:inner==='down', label:labels.down, icon:DOWN, onClick:()=>set('down'), size }));
}

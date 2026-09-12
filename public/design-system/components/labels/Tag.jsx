import React from 'react';
const V = {
  neutral: { background:'var(--surface-sunken)', color:'var(--text-body)', border:'1px solid transparent' },
  ink:     { background:'var(--ink-fill)', color:'var(--on-ink)', border:'1px solid transparent' },
  accent:  { background:'var(--primary-tint)', color:'var(--primary-deep)', border:'1px solid transparent' },
  outline: { background:'transparent', color:'var(--primary)', border:'1px solid var(--primary)' },
  planned: { background:'transparent', color:'var(--text-muted)', border:'1px dashed var(--border-dashed)' },
};
export function Tag({ variant='neutral', kicker=true, children, style }) {
  return React.createElement('span', { style:{ display:'inline-flex', alignItems:'center', gap:5, fontSize: kicker ? 10 : 11, letterSpacing: kicker ? '.08em' : 0, textTransform: kicker ? 'uppercase' : 'none', padding: kicker ? '2px 8px' : '3px 9px', borderRadius:'var(--radius-pill)', whiteSpace:'nowrap', ...V[variant], ...style } }, children);
}

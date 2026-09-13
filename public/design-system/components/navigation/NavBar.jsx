import React from 'react';
export function NavBar({ name='10 Signals', logoSrc, badge, crumbs=[], children, onBrandClick, meta }) {
  return React.createElement('header', { style:{ display:'flex', alignItems:'center', gap:14, padding:'14px 0', fontSize:13, color:'var(--text-muted)' } },
    React.createElement('button', { type:'button', onClick:onBrandClick, style:{ display:'flex', alignItems:'center', gap:8, border:0, background:'transparent', color:'var(--text)', cursor:'pointer', padding:0, fontSize:14, fontWeight:600, fontFamily:'inherit' } },
      logoSrc ? React.createElement('img', { src:logoSrc, alt:'', style:{ width:8, height:8, filter:'drop-shadow(0 0 5px var(--primary))' } }) : React.createElement('span', { style:{ width:8, height:8, borderRadius:'50%', background:'var(--primary)', boxShadow:'var(--glow-primary)' } }),
      name, badge),
    ...crumbs.flatMap((c,i)=>[React.createElement('span', { key:'s'+i, 'aria-hidden':true }, '/'), React.createElement('span', { key:'c'+i, dir:'ltr' }, c)]),
    React.createElement('span', { style:{ flex:1 } }),
    meta && React.createElement('span', { style:{ fontSize:11 } }, meta),
    children);
}

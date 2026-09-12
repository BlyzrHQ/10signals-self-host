import React from 'react';
export function Tabs({ tabs, value, onChange, plannedLabel='Planned', trailing, rtl=false }) {
  const live = tabs.filter(t=>!t.planned), planned = tabs.filter(t=>t.planned);
  const onKey = (e) => { const keys = live.map(t=>t.key); let i = keys.indexOf(value); const fwd = rtl?'ArrowLeft':'ArrowRight', back = rtl?'ArrowRight':'ArrowLeft';
    if (e.key===fwd) i=(i+1)%keys.length; else if (e.key===back) i=(i+keys.length-1)%keys.length; else if (e.key==='Home') i=0; else if (e.key==='End') i=keys.length-1; else return;
    e.preventDefault(); onChange(keys[i]); const el = e.currentTarget.parentElement.querySelector('[data-tab="'+keys[i]+'"]'); el && el.focus(); };
  const btn = (t, sel) => React.createElement('button', { key:t.key, role:'tab', 'aria-selected':sel, 'data-tab':t.key, tabIndex: sel?0:-1, onClick:()=>!t.planned && onChange(t.key), onKeyDown:onKey,
    style:{ border:0, background:'transparent', cursor:'pointer', padding:'10px 14px', fontSize:14, color: t.planned ? 'var(--text-faint)' : sel ? 'var(--text)' : 'var(--text-muted)', borderBottom:'2px solid '+(sel?'var(--primary)':'transparent'), marginBottom:-1, display:'inline-flex', alignItems:'center', gap:6, fontFamily:'inherit' } },
    t.label, t.count!=null && React.createElement('span', { style:{ fontSize:11, color:'var(--text-faint)', fontVariantNumeric:'tabular-nums' } }, t.count),
    t.planned && React.createElement('span', { style:{ fontSize:9, letterSpacing:'.08em', textTransform:'uppercase', border:'1px dashed var(--border-dashed)', borderRadius:4, padding:'1px 5px' } }, plannedLabel));
  return React.createElement('div', { role:'tablist', style:{ display:'flex', gap:4, alignItems:'center', borderBottom:'1px solid var(--border)' } },
    live.map(t=>btn(t, t.key===value)),
    planned.length ? React.createElement('span', { style:{ width:1, height:20, background:'var(--border-strong)', margin:'0 8px' } }) : null,
    planned.map(t=>btn(t,false)),
    React.createElement('span', { style:{ flex:1 } }), trailing);
}

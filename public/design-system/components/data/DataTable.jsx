import React from 'react';
export function DataTable({ columns, rows, minWidth=720, renderDrawer, openId, highlightId }) {
  const tpl = columns.map(c=>c.width||'minmax(0,1fr)').join(' ');
  const rowStyle = { display:'grid', gridTemplateColumns:tpl, gap:12, padding:'12px 14px', fontSize:13, alignItems:'center' };
  return React.createElement('div', { style:{ borderRadius:'var(--radius-lg)', boxShadow:'var(--ring)', overflowX:'auto' } },
    React.createElement('div', { style:{ minWidth } },
      React.createElement('div', { role:'row', style:{ ...rowStyle, padding:'8px 14px', fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--text-muted)', background:'var(--surface)' } }, columns.map(c=>React.createElement('span', { key:c.key }, c.label))),
      rows.map(r => React.createElement('div', { key:r.id, id:r.anchor, style:{ borderTop:'1px solid var(--border)' } },
        React.createElement('div', { role:'row', style:{ ...rowStyle, background: r.id===highlightId ? 'var(--primary-tint)' : r.id===openId ? 'var(--surface-sunken)' : 'transparent' } }, columns.map(c=>React.createElement('span', { key:c.key, style:{ minWidth:0 } }, c.render ? c.render(r) : r[c.key]))),
        renderDrawer && r.id===openId && React.createElement('div', { style:{ background:'var(--surface)', padding:'4px 14px 18px', fontSize:13 } }, renderDrawer(r))))));
}

import React from 'react';
export function Dialog({ open, title, children, actions, onClose, width=440 }) {
  if (!open) return null;
  return React.createElement('div', { onClick:onClose, style:{ position:'fixed', inset:0, background:'rgba(15,20,25,.35)', display:'grid', placeItems:'center', zIndex:50 } },
    React.createElement('div', { role:'dialog', 'aria-modal':true, 'aria-label':title, onClick:e=>e.stopPropagation(), style:{ width, maxWidth:'calc(100% - 32px)', background:'var(--surface-raised)', borderRadius:'var(--radius-xl)', boxShadow:'var(--shadow-md)', padding:'20px 22px' } },
      title && React.createElement('h2', { style:{ margin:'0 0 8px', fontSize:17, fontWeight:600 } }, title),
      React.createElement('div', { style:{ fontSize:14, color:'var(--text-body)' } }, children),
      actions && React.createElement('div', { style:{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:18 } }, actions)));
}

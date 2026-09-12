import React from 'react';
export function IconButton({ label, children, pressed=false, size=28, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return React.createElement('button', { type:'button', 'aria-label':label, title:label, 'aria-pressed':pressed, onClick, onMouseEnter:()=>setHover(true), onMouseLeave:()=>setHover(false),
    style:{ width:size, height:size, border:'1px solid var(--border-strong)', borderRadius:'var(--radius-sm)', background: pressed ? 'var(--primary-tint)' : hover ? 'var(--hover-wash)' : 'transparent', color: pressed ? 'var(--primary-deep)' : 'var(--text-body)', cursor:'pointer', display:'grid', placeItems:'center', fontSize:12, ...style }, ...rest }, children);
}

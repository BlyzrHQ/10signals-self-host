import React from 'react';
const base = { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, borderRadius:'var(--radius-pill)', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', transition:'background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease)' };
const variants = {
  primary:   { border:'1px solid var(--primary)', color:'var(--primary)', background:'transparent', fontWeight:600 },
  secondary: { border:'1px solid var(--border-strong)', color:'var(--text)', background:'transparent', fontWeight:400 },
  ghost:     { border:'1px solid transparent', color:'var(--text-muted)', background:'transparent', fontWeight:400 },
};
const sizes = { sm:{ padding:'4px 10px', fontSize:12, minHeight:26 }, md:{ padding:'6px 12px', fontSize:13, minHeight:34 }, lg:{ padding:'0 20px', fontSize:14, minHeight:'var(--control-h-lg)' } };
export function Button({ variant='primary', size='md', disabled=false, block=false, type='button', children, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const hoverStyle = hover && !disabled ? (variant==='primary' ? { background:'var(--primary-tint)' } : variant==='secondary' ? { borderColor:'var(--primary)' } : { background:'var(--hover-wash)', color:'var(--text)' }) : null;
  return React.createElement('button', { type, disabled, onClick, onMouseEnter:()=>setHover(true), onMouseLeave:()=>setHover(false),
    style:{ ...base, ...variants[variant], ...sizes[size], ...(block?{width:'100%'}:null), ...(disabled?{opacity:.45,cursor:'default'}:null), ...hoverStyle, ...style }, ...rest }, children);
}

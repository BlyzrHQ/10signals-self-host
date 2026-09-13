import React from 'react';
import { EvidencePill } from '../labels/EvidencePill.jsx';
import { SourceTag } from '../labels/SourceTag.jsx';
import { FeedbackThumbs } from '../actions/FeedbackThumbs.jsx';
function Thumb({ size=40, missing=false, label='IMG', missingLabel='No image' }) {
  return React.createElement('span', { 'aria-hidden':true, style:{ width:size, height:size, flex:'none', borderRadius:'var(--radius-sm)', background: missing?'transparent':'var(--surface-sunken)', border:'1px '+(missing?'dashed':'solid')+' var(--grey-150)', display:'grid', placeItems:'center', color:'var(--ink-300)', fontSize:9, letterSpacing:'.04em' } }, missing?missingLabel:label);
}
export function ProductMatchCard({ product, rivals, labels={ you:'You', rivals:'rivals', rival:'rival', same:'Same product', substitute:'Close substitute' }, onVote }) {
  return React.createElement('section', { style:{ background:'var(--surface)', borderRadius:'var(--radius-lg)', boxShadow:'var(--ring)', display:'grid', gridTemplateColumns:'260px minmax(0,1fr)' } },
    React.createElement('div', { style:{ padding:'16px 18px', borderInlineEnd:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:10 } },
      React.createElement('p', { style:{ margin:0, fontSize:10, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--primary)' } }, labels.you),
      React.createElement(Thumb, { size:72 }),
      React.createElement('div', null, React.createElement('p', { style:{ margin:0, fontSize:15, fontWeight:600 } }, product.name), product.sku && React.createElement('p', { dir:'ltr', style:{ margin:'2px 0 0', fontSize:11, color:'var(--text-faint)', textAlign:'start' } }, product.sku)),
      React.createElement('p', { dir:'ltr', style:{ margin:0, fontSize:22, fontWeight:600, fontVariantNumeric:'tabular-nums', textAlign:'start' } }, product.price),
      React.createElement('p', { style:{ margin:'auto 0 0', fontSize:12, color:'var(--text-muted)' } }, React.createElement('b', { style:{ fontWeight:600, color:'var(--text)' } }, rivals.length+' '+(rivals.length===1?labels.rival:labels.rivals))),
      product.summary && React.createElement('p', { style:{ margin:0, fontSize:12, color:'var(--text-muted)' } }, product.summary)),
    React.createElement('div', { style:{ padding:'14px 16px', display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10, alignContent:'start' } },
      rivals.map(r => { const na = !r.price; const muted = na || r.needsEvidence; return React.createElement('article', { key:r.id, style:{ background:'var(--surface-raised)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:12, display:'flex', flexDirection:'column', gap:8, minWidth:0 } },
        React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:10, minWidth:0 } }, React.createElement(Thumb, { missing:r.noImage }),
          React.createElement('div', { style:{ minWidth:0 } }, React.createElement('p', { style:{ margin:0, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' } }, r.name), React.createElement('a', { href:r.url||'#', dir:'ltr', style:{ fontSize:11, textDecoration:'none', display:'block', textAlign:'start' } }, r.domain))),
        React.createElement('div', { style:{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8, flexWrap:'wrap' } },
          React.createElement('span', { dir:'ltr', style:{ fontSize:18, fontWeight:600, fontVariantNumeric:'tabular-nums', color: na?'var(--text-muted)':'var(--text)' } }, r.price||'Not observed'),
          React.createElement('span', { style:{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-body)' } }, React.createElement('span', { 'aria-hidden':true, style:{ width:8, height:8, borderRadius: r.same?'50%':2, background: r.same?'var(--text)':'transparent', border:'1px solid var(--text-muted)', flex:'none' } }), r.same?labels.same:labels.substitute)),
        React.createElement('p', { style:{ margin:0, fontSize:13, color: muted?'var(--text-muted)': r.youLower?'var(--primary-hover)':'var(--text)' } }, r.diff, React.createElement('span', { style:{ display:'block', fontSize:11, color:'var(--text-faint)' } }, r.basis)),
        React.createElement('div', { style:{ display:'flex', alignItems:'center', gap:8, marginTop:'auto', paddingTop:8, borderTop:'1px solid var(--border)', flexWrap:'wrap' } },
          React.createElement(EvidencePill, { state:r.evidence }), React.createElement('span', { style:{ fontSize:11, color:'var(--text-faint)', whiteSpace:'nowrap' } }, r.confidence),
          React.createElement('span', { style:{ marginInlineStart:'auto' } }, React.createElement(FeedbackThumbs, { size:24, value:r.vote||null, onChange:v=>onVote&&onVote(r.id,v) }))),
        r.next && React.createElement('p', { style:{ margin:0, fontSize:12, color:'var(--text-body)' } }, '→ '+r.next+' ', React.createElement(SourceTag, { source:r.source||'rule' }))); })));
}

import React from 'react';
export function BenchmarkTrack({ label, hint, yours, median, leader, leaderName, status, action, labels={ you:'You', median:'Median', leader:'Leader' } }) {
  return React.createElement('div', { style:{ display:'grid', gridTemplateColumns:'minmax(0,1.1fr) minmax(0,2fr) minmax(0,1.4fr)', gap:20, alignItems:'center', padding:'10px 0', borderTop:'1px solid var(--border)' } },
    React.createElement('div', null, React.createElement('p', { style:{ margin:0, fontSize:14 } }, label), hint && React.createElement('p', { style:{ margin:0, fontSize:11, color:'var(--text-faint)' } }, hint)),
    React.createElement('div', null,
      React.createElement('div', { 'aria-hidden':true, style:{ position:'relative', height:18, background:'var(--surface-sunken)', borderRadius:4 } },
        React.createElement('span', { style:{ position:'absolute', top:0, bottom:0, width:2, background:'var(--text-muted)', insetInlineStart:median+'%' } }),
        React.createElement('span', { style:{ position:'absolute', top:4, width:10, height:10, borderRadius:'50%', border:'1.5px solid var(--text-body)', insetInlineStart:'calc('+leader+'% - 5px)' } }),
        React.createElement('span', { style:{ position:'absolute', top:4, width:10, height:10, background:'var(--primary)', transform:'rotate(45deg)', insetInlineStart:'calc('+yours+'% - 5px)', boxShadow:'0 0 8px var(--primary)' } })),
      React.createElement('p', { style:{ margin:'4px 0 0', fontSize:11, color:'var(--text-muted)', display:'flex', gap:14, fontVariantNumeric:'tabular-nums' } },
        React.createElement('span', null, labels.you+' ', React.createElement('b', { style:{ color:'var(--text)', fontWeight:600 } }, yours)),
        React.createElement('span', null, labels.median+' ', React.createElement('b', { style:{ color:'var(--text)', fontWeight:600 } }, median)),
        React.createElement('span', null, labels.leader+' ', React.createElement('b', { style:{ color:'var(--text)', fontWeight:600 } }, leader), leaderName && React.createElement('span', { dir:'ltr' }, ' ('+leaderName+')')))),
    React.createElement('div', null, React.createElement('p', { style:{ margin:0, fontSize:13 } }, status), action && React.createElement('p', { style:{ margin:'2px 0 0', fontSize:12, color:'var(--text-muted)' } }, action)));
}

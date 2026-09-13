import React from 'react';
export function ProgressPhases({ phases, current=0, failedAt=-1, skipped=[], runningLabel='running' }) {
  const stopped = failedAt >= 0;
  return React.createElement('div', null,
    React.createElement('div', { style:{ height:2, background:'var(--border)', borderRadius:2, overflow:'hidden', marginBottom:28 } }, React.createElement('div', { style:{ height:'100%', width:Math.round(Math.min(current,phases.length)/phases.length*100)+'%', background:'var(--primary)', transition:'width var(--dur-slow) var(--ease)' } })),
    React.createElement('ol', { style:{ listStyle:'none', margin:0, padding:0, display:'grid', gap:2 } }, phases.map((label,i) => {
      const done = i<current, active = i===current && !stopped, failed = stopped && i===failedAt, skip = skipped.includes(i);
      return React.createElement('li', { key:i, style:{ display:'grid', gridTemplateColumns:'22px 1fr auto', gap:12, alignItems:'center', padding:'9px 10px', borderRadius:'var(--radius-lg)', background: active?'var(--primary-tint)': failed?'var(--surface-sunken)':'transparent', color: done||active||failed?'var(--text)':'var(--text-faint)' } },
        React.createElement('span', { 'aria-hidden':true, style:{ fontSize:13, textAlign:'center', color: failed?'var(--text)': done?'var(--text-body)': active?'var(--primary)':'var(--grey-300)' } }, failed?'⚠': done?(skip?'◔':'●'): active?'◐':'○'),
        React.createElement('span', { style:{ fontSize:14 } }, label),
        React.createElement('span', { style:{ fontSize:11, color:'var(--text-faint)', fontVariantNumeric:'tabular-nums' } }, active?runningLabel:'')); })));
}

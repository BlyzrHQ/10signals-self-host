import React from 'react';
import { NavBar } from '../../components/navigation/NavBar.jsx';
import { Tag } from '../../components/labels/Tag.jsx';
import { ProgressPhases } from '../../components/data/ProgressPhases.jsx';
const PHASES = ['Report created','Crawling the company website','Building the catalog','Discovering and verifying competitors','Checking advertising sources','Matching products','Saving the report'];
export function Progress({ domain, onDone }) {
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (step >= PHASES.length) onDone?.();
      else setStep(step + 1);
    }, 1100);
    return () => clearTimeout(timer);
  }, [step, onDone]);
  return <div style={{maxWidth:760,margin:'0 auto',padding:'60px 28px 80px'}}>
    <NavBar logoSrc="../../assets/logo-dot.png" badge={<Tag variant="neutral" style={{border:'1px solid var(--border-strong)',background:'transparent',color:'var(--text-muted)'}}>Live run</Tag>} />
    <p style={{fontSize:11,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--primary)',margin:'24px 0 10px'}}>{step >= PHASES.length ? 'Report saved — opening' : 'Building your market map'}</p>
    <h1 style={{fontSize:36,fontWeight:600,letterSpacing:'-.02em',margin:'0 0 6px'}}><span dir="ltr">{domain}</span></h1>
    <p role="status" aria-live="polite" style={{fontSize:15,color:'var(--text-muted)',margin:'0 0 28px'}}>{PHASES[Math.min(step, PHASES.length-1)]}…</p>
    <ProgressPhases phases={PHASES} current={step} />
    <p style={{fontSize:12,color:'var(--text-faint)',margin:'28px 0 0'}}>You can close this tab. The report keeps running and is saved at <span dir="ltr" style={{color:'var(--text-muted)'}}>/reports/8f3a…c21e</span></p>
  </div>;
}

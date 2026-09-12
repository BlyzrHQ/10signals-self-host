import React from 'react';
import { NavBar } from '../../components/navigation/NavBar.jsx';
import { Tag } from '../../components/labels/Tag.jsx';
import { Button } from '../../components/actions/Button.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Card } from '../../components/surfaces/Card.jsx';
export function Landing({ domain, onDomain, onRun, onSignIn }) {
  return <div style={{maxWidth:1120,margin:'0 auto',padding:'0 28px 80px'}}>
    <NavBar logoSrc="../../assets/logo-dot.png" badge={<Tag variant="outline">Private preview</Tag>}>
      <a href="#how" style={{color:'var(--text-body)',textDecoration:'none',fontSize:14}}>How it works</a>
      <a href="#pricing" style={{color:'var(--text-body)',textDecoration:'none',fontSize:14}}>Pricing</a>
      <Button variant="ghost" size="sm" onClick={onSignIn}>Sign in</Button>
    </NavBar>
    <section style={{padding:'56px 0',display:'grid',gridTemplateColumns:'minmax(0,1.1fr) minmax(0,1fr)',gap:48,alignItems:'center'}}>
      <div>
        <h1 style={{fontSize:'var(--text-display)',lineHeight:'var(--leading-tight)',fontWeight:600,letterSpacing:'var(--tracking-display)',margin:'0 0 28px',textWrap:'pretty'}}>Know your competitors and their prices. Every claim sourced.</h1>
        <form onSubmit={e=>{e.preventDefault();onRun();}} style={{display:'flex',gap:8,maxWidth:600}}>
          <Input ltr value={domain} onChange={e=>onDomain(e.target.value)} placeholder="yourstore.com or a full URL" style={{minHeight:46,fontSize:15}} />
          <Button type="submit" size="lg">Run report</Button>
        </form>
        <p style={{fontSize:12,color:'var(--text-faint)',margin:'12px 0 0'}}>Public pages only. Reports take 3–8 minutes and save to a shareable link. Private preview — no account needed.</p>
      </div>
      <Card variant="raised" padding="20px" style={{borderRadius:'var(--radius-xl)',minHeight:300,display:'grid',placeItems:'center',color:'var(--text-faint)',fontSize:12,border:'1px dashed var(--border-dashed)'}}>Explainer animation slot (see prototype)</Card>
    </section>
    <section style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:14,marginBottom:64}}>
      {[['01 · Competitors','Independently verified rivals with a score, the reason they qualify, and links to their pages.'],['02 · Products','Your products next to comparable rival products with public prices, a match verdict and a safe price difference.'],['03 · Benchmark','Image readiness, product information, findability, purchase path, trust and mobile — you vs market median vs leader.']].map(([k,b]) => <Card key={k}><p style={{fontSize:10,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--primary)',margin:'0 0 8px'}}>{k}</p><p style={{margin:0,fontSize:14,color:'var(--text-body)'}}>{b}</p></Card>)}
    </section>
    <section id="pricing" style={{maxWidth:820}}>
      <div style={{display:'flex',alignItems:'baseline',gap:12,marginBottom:14}}><h2 style={{fontSize:24,fontWeight:600,margin:0}}>Pricing</h2><Tag kicker={false} variant="planned">Launch targets — billing not active</Tag></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:14}}>
        {[['Solo','$49','5 reports a month, up to 50 comparisons each.'],['Growth','$149','25 reports, up to 500 comparisons, CSV export.'],['Agency','$399','Unlimited reports, up to 1,000 comparisons, branded exports (planned).']].map(([n,p,b]) => <Card key={n}><p style={{fontSize:10,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--primary)',margin:'0 0 6px'}}>{n}</p><p dir="ltr" style={{fontSize:26,fontWeight:600,margin:'0 0 4px',fontVariantNumeric:'tabular-nums',textAlign:'start'}}>{p}</p><p style={{fontSize:12,color:'var(--text-muted)',margin:'0 0 10px'}}>per month · target</p><p style={{fontSize:13,color:'var(--text-body)',margin:0}}>{b}</p></Card>)}
      </div>
    </section>
  </div>;
}

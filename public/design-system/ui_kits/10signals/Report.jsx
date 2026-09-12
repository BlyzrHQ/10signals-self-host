import React from 'react';
import { NavBar } from '../../components/navigation/NavBar.jsx';
import { EvidencePill } from '../../components/labels/EvidencePill.jsx';
import { Button } from '../../components/actions/Button.jsx';
import { SourceTag } from '../../components/labels/SourceTag.jsx';
import { Tabs } from '../../components/navigation/Tabs.jsx';
import { Card } from '../../components/surfaces/Card.jsx';
import { Segmented } from '../../components/forms/Segmented.jsx';
import { FilterChips } from '../../components/navigation/FilterChips.jsx';
import { ProductMatchCard } from '../../components/data/ProductMatchCard.jsx';
import { DataTable } from '../../components/data/DataTable.jsx';
import { FeedbackThumbs } from '../../components/actions/FeedbackThumbs.jsx';
import { BenchmarkTrack } from '../../components/data/BenchmarkTrack.jsx';
const COMPETITORS = [
  { name:'Hearthwick', domain:'hearthwick.co', score:91, conf:'High confidence', comparisons:12, reason:'Sells soy candles and reed diffusers to US households in the same $24–$48 band; 18 product families overlap with yours.', ev:[['observed','Category: home fragrance'],['observed','Region: United States'],['observed','Overlap: 18 product families']] },
  { name:'Emberfield', domain:'emberfield.com', score:84, conf:'High confidence', comparisons:8, reason:'Larger catalog spanning candles, diffusers and accessories; overlap concentrated in diffusers and tools.', ev:[['observed','Category: home fragrance'],['observed','Region: United States'],['observed','Overlap: 11 product families']] },
  { name:'Northlight Candle Co.', domain:'northlightcandles.com', score:72, conf:'Medium confidence', comparisons:5, reason:'Small-batch candles at a similar price point. Region inferred from shipping page.', ev:[['observed','Category: candles'],['inferred','Region: US (shipping page)'],['observed','Overlap: 6 product families']] },
  { name:'Wick & Wander', domain:'wickandwander.shop', score:58, conf:'Medium confidence', comparisons:2, reason:'Verified on category and region; product overlap is limited to accessories. Many product pages blocked the crawler.', ev:[['observed','Category: candle accessories'],['observed','Region: United States'],['limited','Overlap: 2 families (crawl blocked)']] },
];
const GROUPS = [
  { product:{ name:'Cedar & Smoke Soy Candle 8 oz', sku:'LO-CDR-8', price:'$34.00', summary:'Among observed comparable prices: 2 of 3 · lowest observed $29.00 (hearthwick.co)' }, rivals:[
    { id:'m1', name:'Cedarwood Smoke Soy Candle 8 oz', domain:'hearthwick.co', price:'$29.00', same:true, diff:'Rival 14.7% lower', basis:'Direct · same size, USD', evidence:'observed', confidence:'92% · high', next:'Review price or make the 60-hour burn time visible', source:'ai' },
    { id:'m9', name:'Smoked Cedar Candle 8 oz', domain:'emberfield.com', price:'$36.00', diff:'You are 5.6% lower', basis:'Direct · same size, USD', youLower:true, evidence:'observed', confidence:'83% · medium', next:'Hold price' },
    { id:'m10', name:'Cedar Ember 8 oz', domain:'northlightcandles.com', diff:'Not calculable', basis:'Rival price not observed', evidence:'limited', confidence:'74% · medium', next:'Recheck rival product page for a public price', noImage:true } ] },
  { product:{ name:'Discovery Set, 4 × 2 oz', sku:'LO-DSC-4', price:'$38.00', summary:'Among observed comparable prices: 1 of 2 · lowest observed $38.00 (you)' }, rivals:[
    { id:'m7', name:'Sampler Set, 4 × 2 oz', domain:'northlightcandles.com', price:'$44.00', diff:'You are 13.6% lower', basis:'Direct · same quantity, USD', youLower:true, evidence:'observed', confidence:'85% · high', next:'Feature the set on the homepage', source:'ai' },
    { id:'m11', name:'Trio Discovery Set, 3 × 2 oz', domain:'hearthwick.co', price:'$32.00', diff:'Needs evidence', basis:'Set size differs · listed prices kept', needsEvidence:true, evidence:'inferred', confidence:'68% · low', next:'Compare per candle before acting' } ] },
];
const BENCH = [
  ['Image readiness','Coverage, alt text, responsive markup',92,78,92,'you','14 points ahead of market median','Proven advantage — keep it.'],
  ['Product information','Price, image, description, identifiers',71,80,88,'emberfield.com','9 points behind market median','Complete 14 missing public fields in the product sample.'],
  ['Product findability','How directly products surface',85,70,85,'you','15 points ahead of market median','Proven advantage — keep it.'],
  ['Purchase path','Public cart and checkout controls',74,74,90,'hearthwick.co','At market median','No proven gap, no proven advantage.'],
  ['Trust readiness','Shipping, returns, contact, policies',60,82,95,'hearthwick.co','22 points behind market median','Expose clearer public evidence for returns and company information.'],
  ['Mobile & access','Viewport, language, image alternatives',88,80,91,'emberfield.com','8 points ahead of market median','Proven advantage — keep it.'],
];
export function Report({ domain, onHome, onAccount }) {
  const [tab, setTab] = React.useState('competitors');
  const [filter, setFilter] = React.useState('');
  const [view, setView] = React.useState('byproduct');
  const [votes, setVotes] = React.useState({});
  const groups = GROUPS.map(g => ({ ...g, rivals: g.rivals.filter(r => !filter || r.domain===filter).map(r => ({ ...r, vote: votes[r.id]||null })) })).filter(g => g.rivals.length);
  return <div style={{maxWidth:'var(--content-max)',margin:'0 auto',padding:'0 28px 80px'}}>
    <NavBar logoSrc="../../assets/logo-dot.png" crumbs={[domain]} meta="Observed 14 Aug 2026 · Report v1" onBrandClick={onHome}>
      <button onClick={onAccount} aria-label="Account" style={{width:30,height:30,borderRadius:'50%',border:'1px solid var(--border-strong)',background:'var(--primary-tint)',color:'var(--primary-deep)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>MB</button>
    </NavBar>
    <section style={{display:'grid',gridTemplateColumns:'minmax(0,1.6fr) minmax(0,1fr)',gap:28,padding:'18px 0 24px',borderBottom:'1px solid var(--border)'}}>
      <div>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}><h1 style={{fontSize:30,fontWeight:600,letterSpacing:'-.02em',margin:0}}><span dir="ltr">{domain}</span></h1><EvidencePill state="observed" uppercase>Complete</EvidencePill></div>
        <p style={{fontSize:18,margin:'0 0 12px',maxWidth:640,textWrap:'pretty'}}>Price parity on core candles; you trail Hearthwick on 3 of 8 matched products and lead on accessories.</p>
        <div style={{display:'flex',gap:18,flexWrap:'wrap',fontSize:13,color:'var(--text-muted)'}}>{[['4','verified competitors'],['27','accepted comparisons'],['19','direct price comparisons'],['42','products observed']].map(([n,l]) => <span key={l}><b style={{fontWeight:600,color:'var(--text)',fontVariantNumeric:'tabular-nums'}}>{n}</b> {l}</span>)}</div>
      </div>
      <div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginBottom:16}}><Button variant="secondary">Share</Button><Button variant="secondary">Export CSV</Button><Button variant="secondary">Print</Button></div>
        <p style={{fontSize:10,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--text-muted)',margin:'0 0 8px'}}>Next moves</p>
        <ol style={{listStyle:'none',margin:0,padding:0,display:'grid',gap:6}}>
          {[['Review Cedar & Smoke 8 oz — Hearthwick is 14.7% lower on the same product.','ai'],['Expose returns and company information — your largest proven gap (22 points).','rule'],['Protect your accessory price lead (lower on 3 of 3 matched accessories).','rule']].map(([t,s]) => <li key={t} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'start',padding:'9px 12px',background:'var(--surface)',borderRadius:'var(--radius-lg)',fontSize:13}}><span>{t}</span><SourceTag source={s}/></li>)}
        </ol>
      </div>
    </section>
    <div style={{paddingTop:12}}><Tabs value={tab} onChange={setTab} tabs={[{key:'competitors',label:'Competitors',count:4},{key:'products',label:'Products',count:27},{key:'benchmark',label:'Benchmark',count:6},{key:'ads',label:'Advertising',planned:true},{key:'ev',label:'Evidence & Method',planned:true}]} trailing={<span style={{fontSize:11,color:'var(--text-faint)'}} dir="ltr">#{tab}</span>} /></div>
    <div style={{display:'flex',gap:14,alignItems:'center',padding:'12px 0',fontSize:11,color:'var(--text-muted)',flexWrap:'wrap'}}><span style={{letterSpacing:'.08em',textTransform:'uppercase',fontSize:10}}>Evidence</span><EvidencePill state="observed"/><EvidencePill state="inferred"/><EvidencePill state="limited"/><EvidencePill state="unavailable"/><span style={{marginInlineStart:'auto'}}>◐ marks AI-assisted judgement</span></div>
    {tab==='competitors' && <section style={{display:'grid',gap:12}}>
      {COMPETITORS.map(c => <Card key={c.domain} variant="outline" style={{display:'grid',gridTemplateColumns:'minmax(0,1.5fr) minmax(0,1fr) auto',gap:24,background:'var(--surface)'}}>
        <div><div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap',marginBottom:6}}><h3 style={{fontSize:18,fontWeight:600,margin:0}}>{c.name}</h3><a href={'https://'+c.domain} dir="ltr" style={{fontSize:13}}>{c.domain} ↗</a></div>
          <p style={{margin:'0 0 12px',fontSize:14,color:'var(--text-body)'}}>{c.reason}</p>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{c.ev.map(([s,t]) => <EvidencePill key={t} state={s}>{t}</EvidencePill>)}</div></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 16px',fontSize:12,color:'var(--text-muted)',alignContent:'start'}}>
          <div><p style={{margin:0,fontSize:10,letterSpacing:'.08em',textTransform:'uppercase'}}>Verification</p><p style={{margin:'2px 0 0',fontSize:20,color:'var(--text)',fontVariantNumeric:'tabular-nums'}}>{c.score}<span style={{fontSize:12,color:'var(--text-muted)'}}>/100</span></p><p style={{margin:0}}>{c.conf}</p></div>
          <div><p style={{margin:0,fontSize:10,letterSpacing:'.08em',textTransform:'uppercase'}}>Accepted matches</p><p style={{margin:'2px 0 0',fontSize:20,color:'var(--text)',fontVariantNumeric:'tabular-nums'}}>{c.comparisons}</p><p style={{margin:0}}>Observed 14 Aug 2026</p></div>
        </div>
        <div><Button onClick={()=>{setFilter(c.domain);setTab('products');setView('byproduct');}}>{c.comparisons} matchups →</Button></div>
      </Card>)}
    </section>}
    {tab==='products' && <section>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap'}}>
        <Segmented label="View" value={view} onChange={setView} options={[{value:'byproduct',label:'By product'},{value:'table',label:'Table'}]} />
        <FilterChips label="Competitor" value={filter} onChange={setFilter} options={[{key:'',label:'All',count:27},...COMPETITORS.map(c=>({key:c.domain,label:c.domain,count:c.comparisons}))]} />
      </div>
      {view==='byproduct' && <div style={{display:'grid',gap:12}}>{groups.map(g => <ProductMatchCard key={g.product.name} product={g.product} rivals={g.rivals} onVote={(id,v)=>setVotes(p=>({...p,[id]:v}))} />)}</div>}
      {view==='table' && <DataTable minWidth={900} columns={[{key:'yours',label:'Your product',width:'minmax(180px,2fr)',render:r=>r.product.name},{key:'yp',label:'Your price',width:'84px',render:r=><span dir="ltr" style={{fontVariantNumeric:'tabular-nums'}}>{r.product.price}</span>},{key:'rival',label:'Rival product',width:'minmax(180px,2fr)',render:r=><span><span style={{display:'block'}}>{r.name}</span><span dir="ltr" style={{fontSize:11,color:'var(--primary)'}}>{r.domain}</span></span>},{key:'rp',label:'Rival price',width:'96px',render:r=><span dir="ltr" style={{fontVariantNumeric:'tabular-nums',color:r.price?'var(--text)':'var(--text-muted)'}}>{r.price||'Not observed'}</span>},{key:'diff',label:'Price difference',width:'minmax(150px,1.3fr)',render:r=><span><span style={{display:'block'}}>{r.diff}</span><span style={{fontSize:11,color:'var(--text-faint)'}}>{r.basis}</span></span>},{key:'ev',label:'Evidence',width:'120px',render:r=><EvidencePill state={r.evidence}/>},{key:'next',label:'Next move',width:'minmax(170px,1.5fr)',render:r=><span style={{fontSize:12}}>{r.next} <SourceTag source={r.source||'rule'}/></span>},{key:'fb',label:'Useful?',width:'60px',render:r=><FeedbackThumbs value={votes[r.id]||null} onChange={v=>setVotes(p=>({...p,[r.id]:v}))}/>}]} rows={groups.flatMap(g => g.rivals.map(r => ({ ...r, product:g.product })))} />}
    </section>}
    {tab==='benchmark' && <section style={{display:'grid',gap:18}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12}}>
        <Card kicker="Dimensions led" padding="14px 16px"><p style={{margin:0,fontSize:26,fontWeight:600,fontVariantNumeric:'tabular-nums'}}>2<span style={{fontSize:14,color:'var(--text-muted)'}}>/6</span></p></Card>
        <Card kicker="Largest proven gap" padding="14px 16px"><p style={{margin:0,fontSize:17,fontWeight:600}}>Trust readiness</p><p style={{margin:'2px 0 0',fontSize:11,color:'var(--text-faint)'}}>22 points behind market median</p></Card>
        <Card kicker="Strongest proven edge" padding="14px 16px"><p style={{margin:0,fontSize:17,fontWeight:600}}>Image readiness</p><p style={{margin:'2px 0 0',fontSize:11,color:'var(--text-faint)'}}>14 points ahead of market median</p></Card>
        <Card kicker="Crawl response" padding="14px 16px"><p dir="ltr" style={{margin:0,fontSize:26,fontWeight:600,fontVariantNumeric:'tabular-nums',textAlign:'start'}}>410 <span style={{fontSize:14,color:'var(--text-muted)'}}>ms</span></p></Card>
      </div>
      <Card variant="outline" padding="16px 18px">
        <div style={{display:'flex',alignItems:'baseline',gap:14,marginBottom:12,flexWrap:'wrap'}}><h3 style={{fontSize:16,fontWeight:600,margin:0}}>What to fix and what to protect</h3><span style={{fontSize:11,color:'var(--text-muted)'}}>Readiness out of 100.</span><span style={{flex:1}}/><span style={{display:'inline-flex',gap:14,fontSize:11,color:'var(--text-muted)',whiteSpace:'nowrap'}}><span>◆ You</span><span>│ Median</span><span>○ Leader</span></span></div>
        {BENCH.map(([l,h,y,m,ld,ln,s,a]) => <BenchmarkTrack key={l} label={l} hint={h} yours={y} median={m} leader={ld} leaderName={ln} status={s} action={a} />)}
      </Card>
    </section>}
  </div>;
}

import React from 'react';
import { NavBar } from '../../components/navigation/NavBar.jsx';
import { Tag } from '../../components/labels/Tag.jsx';
import { Input } from '../../components/forms/Input.jsx';
import { Button } from '../../components/actions/Button.jsx';
export function SignIn({ onDone, onHome }) {
  const [mode, setMode] = React.useState('signup');
  const [email, setEmail] = React.useState('moe@bannaa.co');
  const [pw, setPw] = React.useState('');
  const [err, setErr] = React.useState('');
  return <div style={{maxWidth:420,margin:'0 auto',padding:'64px 28px 80px'}}>
    <NavBar logoSrc="../../assets/logo-dot.png" onBrandClick={onHome} />
    <div style={{display:'flex',alignItems:'center',gap:8,margin:'24px 0 6px'}}><p style={{margin:0,fontSize:10,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--text-muted)'}}>Your 10 Signals account</p><Tag variant="planned">Planned</Tag></div>
    <h1 style={{fontSize:28,fontWeight:600,letterSpacing:'-.02em',margin:'0 0 6px'}}>{mode==='signup'?'Create your account.':'Welcome back.'}</h1>
    <p style={{color:'var(--text-muted)',margin:'0 0 22px',fontSize:14}}>Your reports, plan limits and API keys stay attached to one private account.</p>
    <form onSubmit={e=>{e.preventDefault(); if(!email.includes('@')||pw.length<8){setErr('Enter your email and a password of at least 8 characters.');return;} onDone();}} style={{display:'grid',gap:12}}>
      {mode==='signup' && <Input label="Name" defaultValue="Moe Bannaa" />}
      <Input label="Email" ltr type="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <Input label="Password" ltr type="password" value={pw} onChange={e=>setPw(e.target.value)} error={err} />
      <Button type="submit" size="lg" style={{marginTop:4}}>{mode==='signup'?'Create account':'Sign in'}</Button>
    </form>
    <Button variant="ghost" size="sm" style={{marginTop:12,color:'var(--primary)',paddingInlineStart:0}} onClick={()=>{setMode(mode==='signup'?'signin':'signup');setErr('');}}>{mode==='signup'?'Already have an account? Sign in':'New here? Create an account'}</Button>
    <p style={{fontSize:12,color:'var(--text-faint)',margin:'28px 0 0'}}>Accounts are planned, not live: during the private preview reports work without one and are saved to unlisted links.</p>
  </div>;
}

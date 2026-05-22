import React, { useEffect, useState } from 'react';
import { Card, SectionLabel, T } from '../lib/ui.jsx';
import db from '../lib/db.js';
import supabase, { initSupabase, setConfig, signInMagic, signUpWithPassword, signInWithPassword, signOut, getUser, onAuthStateChange, uploadBackup, fetchLatestBackup } from '../lib/supabase.js';
import { store } from '../lib/store.js';

export default function CloudSync(){
  const [configured,setConfigured] = useState(false);
  const [user,setUser] = useState(null);
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [authMethod,setAuthMethod] = useState('otp'); // 'otp' or 'password'
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState('');
  const [url,setUrl] = useState('');
  const [key,setKey] = useState('');
  const [autoSync,setAutoSync] = useState(Boolean(store.get('supabase:autoSync')));

  useEffect(()=>{
    const cfg = store.get('supabase')||{};
    setUrl(cfg.url || import.meta.env.VITE_SUPABASE_URL || '');
    setKey(cfg.key || import.meta.env.VITE_SUPABASE_ANON_KEY || '');
    const has = (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) || (cfg.url && cfg.key);
    setConfigured(Boolean(has));
    if (has){
      initSupabase().then(()=> getUser().then(u=>setUser(u))).catch(()=>{});
      const off = onAuthStateChange(()=>{ getUser().then(u=>setUser(u)); });
      return ()=>{ try{ off(); }catch(e){} };
    }
  },[]);

  const handleSaveConfig = async ()=>{
    setBusy(true);
    try{
      if (!url || !key) return setStatus('Please provide URL and key');
      setConfig(url,key);
      await initSupabase();
      setConfigured(true);
      setStatus('Saved');
      const u = await getUser(); setUser(u);
    }catch(e){ setStatus('Save/init failed'); }
    finally{ setBusy(false); }
  };

  const handleSignIn = async ()=>{
    setBusy(true); setStatus('Sending magic link...');
    try{
      await signInMagic(email);
      setStatus('Magic link sent to your email. Open it to sign in.');
    }catch(e){ setStatus('Sign-in failed'); }
    finally{ setBusy(false); }
  };

  const handleSignOut = async ()=>{
    setBusy(true);
    try{ await signOut(); setUser(null); setStatus('Signed out'); }catch(e){ setStatus('Sign-out failed'); }
    finally{ setBusy(false); }
  };

  const handleSignUpPassword = async ()=>{
    setBusy(true); setStatus('Signing up...');
    try{
      const res = await signUpWithPassword(email, password);
      if (res.error) throw res.error;
      setStatus('Sign-up complete. Please check your email if confirmation required.');
    }catch(e){ console.warn(e); setStatus('Sign-up failed: '+(e.message||e)); }
    finally{ setBusy(false); }
  };

  const handleSignInPassword = async ()=>{
    setBusy(true); setStatus('Signing in...');
    try{
      const res = await signInWithPassword(email, password);
      if (res.error) throw res.error;
      setStatus('Signed in');
      const u = await getUser(); setUser(u);
    }catch(e){ console.warn(e); setStatus('Sign-in failed: '+(e.message||e)); }
    finally{ setBusy(false); }
  };

  const handleSyncNow = async ()=>{
    setBusy(true); setStatus('Syncing...');
    try{
      const payload = await db.exportJSON();
      const res = await uploadBackup(payload);
      if (res.error) throw res.error;
      setStatus('Synced to cloud');
    }catch(e){ console.warn(e); setStatus('Sync failed: '+(e.message||e)); }
    finally{ setBusy(false); }
  };

  const handleRestoreCloud = async ()=>{
    setBusy(true); setStatus('Fetching latest backup...');
    try{
      const res = await fetchLatestBackup();
      if (res.error) throw res.error;
      const data = res.data?.payload;
      if (!data) return setStatus('No backup found');
      await db.importJSON(data);
      window.dispatchEvent(new CustomEvent('nutryx:imported'));
      setStatus('Restored latest backup');
    }catch(e){ console.warn(e); setStatus('Restore failed: '+(e.message||e)); }
    finally{ setBusy(false); }
  };

  return (
    <Card>
      <SectionLabel>Cloud Sync (Supabase)</SectionLabel>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {!configured && (
          <>
            <div style={{color:T.textMuted,fontSize:13}}>To use cloud sync provide Supabase URL and Anon key (or set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).</div>
            <input placeholder="Supabase URL" value={url} onChange={(e)=>setUrl(e.target.value)} style={{padding:8,borderRadius:8,border:'1px solid #2b4a6f'}} />
            <input placeholder="Supabase ANON KEY" value={key} onChange={(e)=>setKey(e.target.value)} style={{padding:8,borderRadius:8,border:'1px solid #2b4a6f'}} />
            <div style={{display:'flex',gap:8}}>
              <button onClick={handleSaveConfig} disabled={busy} style={{background:'#3b82f6',border:'none',color:'#080d14',padding:'8px 12px',borderRadius:8,fontWeight:700}}>Save & Init</button>
            </div>
          </>
        )}

        {configured && (
          <>
            <div style={{color:T.textMuted,fontSize:13}}>{user?`Signed in: ${user.email}`:'Not signed in'}</div>
            {!user && (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setAuthMethod('otp')} disabled={busy} style={{padding:'6px 10px',borderRadius:8,background:authMethod==='otp'?'#3b82f6':'transparent',border:authMethod==='otp'?'none':'1px solid #2b4a6f',color:authMethod==='otp'?'#080d14':'#e8f0fe'}}>Magic link</button>
                  <button onClick={()=>setAuthMethod('password')} disabled={busy} style={{padding:'6px 10px',borderRadius:8,background:authMethod==='password'?'#3b82f6':'transparent',border:authMethod==='password'?'none':'1px solid #2b4a6f',color:authMethod==='password'?'#080d14':'#e8f0fe'}}>Email / Password</button>
                </div>
                {authMethod==='otp' && (
                  <div style={{display:'flex',gap:8}}>
                    <input placeholder='Email for magic link' value={email} onChange={e=>setEmail(e.target.value)} style={{padding:8,borderRadius:8,border:'1px solid #2b4a6f'}} />
                    <button onClick={handleSignIn} disabled={busy||!email} style={{background:'#3b82f6',border:'none',color:'#080d14',padding:'8px 12px',borderRadius:8,fontWeight:700}}>Send link</button>
                  </div>
                )}
                {authMethod==='password' && (
                  <div style={{display:'flex',gap:8}}>
                    <input placeholder='Email' value={email} onChange={e=>setEmail(e.target.value)} style={{padding:8,borderRadius:8,border:'1px solid #2b4a6f'}} />
                    <input placeholder='Password' type='password' value={password} onChange={e=>setPassword(e.target.value)} style={{padding:8,borderRadius:8,border:'1px solid #2b4a6f'}} />
                    <button onClick={handleSignInPassword} disabled={busy||!email||!password} style={{background:'#3b82f6',border:'none',color:'#080d14',padding:'8px 12px',borderRadius:8,fontWeight:700}}>Sign in</button>
                    <button onClick={handleSignUpPassword} disabled={busy||!email||!password} style={{background:'transparent',border:'1px solid #3b82f6',color:'#3b82f6',padding:'8px 12px',borderRadius:8}}>Sign up</button>
                  </div>
                )}
              </div>
            )}

            {user && (
              <div style={{display:'flex',gap:8}}>
                <button onClick={handleSyncNow} disabled={busy} style={{background:'#3b82f6',border:'none',color:'#080d14',padding:'8px 12px',borderRadius:8,fontWeight:700}}>Sync now</button>
                <button onClick={handleRestoreCloud} disabled={busy} style={{background:'transparent',border:'1px solid #3b82f6',color:'#3b82f6',padding:'8px 12px',borderRadius:8}}>Restore latest</button>
                <button onClick={handleSignOut} disabled={busy} style={{background:'transparent',border:'1px solid #e05',color:'#e05',padding:'8px 12px',borderRadius:8}}>Sign out</button>
              </div>
            )}

            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <input id="autosync" type="checkbox" checked={autoSync} onChange={(e)=>{ setAutoSync(e.target.checked); store.set('supabase:autoSync', !!e.target.checked); }} />
              <label htmlFor="autosync" style={{color:T.textMuted,fontSize:13}}>Enable auto-sync (upload on change)</label>
            </div>

            <div style={{color:T.textMuted,fontSize:12}}>{status}</div>
          </>
        )}
      </div>
    </Card>
  );
}

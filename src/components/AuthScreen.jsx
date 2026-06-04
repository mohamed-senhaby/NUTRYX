import React, { useState } from 'react';
import { T } from '../lib/ui.jsx';
import { signInWithPassword, signUpWithPassword } from '../lib/supabase.js';

export default function AuthScreen({ onAuth }) {
  const [mode, setMode]       = useState('signin');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [msg, setMsg]         = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    if (mode === 'signup' && password !== confirm) { setError('Passwords do not match.'); return; }
    if (mode === 'signup' && password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const fn = mode === 'signup' ? signUpWithPassword : signInWithPassword;
      const { data, error: err } = await fn(email.trim(), password);
      if (err) { setError(err.message); setLoading(false); return; }

      if (mode === 'signup' && !data?.session) {
        setMsg('✓ Account created! Check your email to confirm, then sign in.');
        setMode('signin'); setLoading(false); return;
      }
      if (data?.user) onAuth(data.user);
    } catch (e) {
      setError(e.message || 'Something went wrong');
    }
    setLoading(false);
  };

  const inp = (val, set, placeholder, type='text') => (
    <input
      type={type} value={val}
      onChange={e => { set(e.target.value); setError(''); }}
      placeholder={placeholder}
      style={{
        width:'100%', background:T.surfaceHigh, border:`1px solid ${T.border}`,
        borderRadius:12, padding:'14px 16px', color:T.text, fontSize:15,
        outline:'none', marginBottom:10
      }}
    />
  );

  return (
    <div style={{
      minHeight:'100dvh', background:T.bg, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:24
    }}>
      <div style={{marginBottom:32, textAlign:'center'}}>
        <div style={{fontSize:42, marginBottom:6}}>🥗</div>
        <div style={{fontWeight:900, color:T.accent, fontSize:28, letterSpacing:1}}>NUTRYX</div>
        <div style={{color:T.textMuted, fontSize:14, marginTop:4}}>Your personal health tracker</div>
      </div>

      <div style={{
        width:'100%', maxWidth:400, background:T.surface,
        borderRadius:20, padding:28, border:`1px solid ${T.border}`
      }}>
        <div style={{display:'flex', background:T.surfaceHigh, borderRadius:12, padding:4, marginBottom:22}}>
          {[['signin','Sign In'],['signup','Sign Up']].map(([m,l])=>(
            <button key={m} onClick={()=>{ setMode(m); setError(''); setMsg(''); }}
              style={{
                flex:1, padding:'10px', background:mode===m?T.accent:T.surfaceHigh,
                color:mode===m?'#080d14':T.textMuted, border:'none', borderRadius:10,
                fontWeight:700, cursor:'pointer', fontSize:14, transition:'background 0.2s'
              }}>{l}</button>
          ))}
        </div>

        <form onSubmit={submit}>
          {inp(email, setEmail, 'Email address', 'email')}
          {inp(password, setPassword, 'Password', 'password')}
          {mode === 'signup' && inp(confirm, setConfirm, 'Confirm password', 'password')}

          {error && (
            <div style={{
              marginBottom:12, padding:'10px 14px', background:`${T.red}15`,
              border:`1px solid ${T.red}40`, borderRadius:10, color:T.red, fontSize:13
            }}>{error}</div>
          )}
          {msg && (
            <div style={{
              marginBottom:12, padding:'10px 14px', background:`${T.green}15`,
              border:`1px solid ${T.green}40`, borderRadius:10, color:T.green, fontSize:13
            }}>{msg}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'14px', background:loading?T.accentDim:T.accent,
            color:'#080d14', border:'none', borderRadius:12, fontWeight:800,
            fontSize:15, cursor:loading?'default':'pointer'
          }}>
            {loading ? '…' : mode==='signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>

      <div style={{marginTop:20, color:T.textMuted, fontSize:12, textAlign:'center', maxWidth:340}}>
        Your data is stored privately — no one else can see it.
      </div>
    </div>
  );
}

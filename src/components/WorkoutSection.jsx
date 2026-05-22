import React, { useState } from 'react';
import { Card, SectionLabel, T, Input, Btn } from '../lib/ui.jsx';
import { L } from '../lib/i18n.js';
import { store } from '../lib/store.js';

export default function WorkoutSection(){
  const [desc,setDesc] = useState('');
  const [mins,setMins] = useState('');
  const [intensity,setIntensity] = useState('moderate');

  const save = ()=>{
    if(!desc.trim() || !mins) return;
    const entry = { desc: desc.trim(), mins: parseInt(mins)||0, intensity, at: new Date().toISOString() };
    const hist = store.get('workout:entries')||[];
    hist.unshift(entry);
    store.set('workout:entries', hist.slice(0,50));
    setDesc(''); setMins(''); setIntensity('moderate');
  };

  const entries = store.get('workout:entries')||[];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <Card>
        <SectionLabel>{L('workout') || 'Workout'}</SectionLabel>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <Input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="e.g. 30 min jog" style={{flex:1}} />
          <Input value={mins} onChange={e=>setMins(e.target.value)} placeholder="mins" type="number" style={{width:90}} />
          <select value={intensity} onChange={e=>setIntensity(e.target.value)} style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,borderRadius:12,padding:'10px 12px',color:T.text}}>
            <option value="light">Light</option>
            <option value="moderate">Moderate</option>
            <option value="hard">Hard</option>
          </select>
          <Btn onClick={save}>Log</Btn>
        </div>
      </Card>

      <Card>
        <SectionLabel>Recent Sessions</SectionLabel>
        <div style={{color:T.textMuted}}>
          {entries.length===0 && <div>No sessions yet.</div>}
          {entries.slice(0,6).map((s,idx)=> (
            <div key={idx} style={{padding:'8px 0',borderBottom: idx===5? 'none':'1px dashed rgba(255,255,255,0.03)'}}>
              <div style={{fontWeight:700}}>{s.desc}</div>
              <div style={{color:T.textMuted,fontSize:13}}>{s.mins} min • {s.intensity} • {new Date(s.at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

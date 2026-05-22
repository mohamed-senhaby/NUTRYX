import React, { useState } from 'react';
import { Card, SectionLabel, T, Input, Btn } from '../lib/ui.jsx';
import { L } from '../lib/i18n.js';
import { store } from '../lib/store.js';

export default function WeightSection(){
  const last = store.get('weight:last')||null;
  const [value,setValue] = useState('');
  const [saving,setSaving] = useState(false);

  const save = ()=>{
    const v = parseFloat(value);
    if(!v || isNaN(v)) return;
    setSaving(true);
    const entry = { value: Math.round(v*10)/10, at: new Date().toISOString() };
    try{
      store.set('weight:last', entry);
      // append history
      const hist = store.get('weight:history')||[];
      hist.unshift(entry);
      store.set('weight:history', hist.slice(0,50));
      setValue('');
    }finally{ setSaving(false); }
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <Card>
        <SectionLabel>{L('weight') || 'Weight'}</SectionLabel>
        <div style={{color:T.textMuted,marginBottom:12}}>{last?`Last: ${last.value} kg on ${new Date(last.at).toLocaleDateString()}`:'No weight entries yet.'}</div>
        <div style={{display:'flex',gap:8}}>
          <Input value={value} onChange={e=>setValue(e.target.value)} placeholder="kg" type="number" style={{width:120}} />
          <Btn onClick={save} disabled={saving||!value}>{saving? 'Saving...' : (L('startApp') || 'Save')}</Btn>
        </div>
      </Card>
      <Card>
        <SectionLabel>History</SectionLabel>
        <div style={{color:T.textMuted,fontSize:14}}>
          {(store.get('weight:history')||[]).slice(0,5).map((e,idx)=> (
            <div key={idx} style={{padding:'6px 0',borderBottom: idx===4? 'none':'1px dashed rgba(255,255,255,0.03)'}}>
              {e.value} kg — {new Date(e.at).toLocaleDateString()}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

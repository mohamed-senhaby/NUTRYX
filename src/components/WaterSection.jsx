import React from 'react';
import { Card, SectionLabel, Btn, T } from '../lib/ui.jsx';
import { L } from '../lib/i18n.js';
import { store } from '../lib/store.js';

export default function WaterSection(){
  const water = store.get('today:water')||0;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <Card>
        <SectionLabel>{L('water') || 'Water'}</SectionLabel>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:28,fontWeight:900,color:T.accent}}>{water} {L('kcal')||'glasses'}</div>
          <div style={{display:'flex',gap:8}}>
            <Btn onClick={()=>{store.set('today:water',(water||0)+1);window.dispatchEvent(new CustomEvent('nutryx:data-changed'));}} small>+1</Btn>
            <Btn onClick={()=>{store.set('today:water',Math.max(0,(water||0)-1));window.dispatchEvent(new CustomEvent('nutryx:data-changed'));}} small>-1</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}

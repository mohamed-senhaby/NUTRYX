import React, { useState, useEffect } from 'react';
import { Card, SectionLabel, Btn, T } from '../lib/ui.jsx';
import { L } from '../lib/i18n.js';
import db from '../lib/db.js';

function WaterChart({history}){
  if(!history||history.length<2)return null;
  const sorted=[...history].sort((a,b)=>a.date<b.date?-1:1).slice(-14);
  const vals=sorted.map(e=>e.amount);
  const max=Math.max(...vals,1);
  return(
    <div>
      <div style={{display:'flex',gap:3,alignItems:'flex-end',height:60}}>
        {sorted.map(({date,amount},i)=>{
          const h=Math.max(amount>0?3:0,Math.round((amount/max)*52));
          const isToday=i===sorted.length-1;
          return(
            <div key={date} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              <div title={`${date}: ${amount} glasses`} style={{width:'100%',height:h,background:isToday?T.accent:`${T.accent}55`,borderRadius:'3px 3px 0 0'}}/>
              <div style={{fontSize:8,color:T.textMuted}}>{new Date(date+'T12:00:00').toLocaleDateString('en',{weekday:'short'})}</div>
            </div>
          );
        })}
      </div>
      <div style={{fontSize:11,color:T.textMuted,textAlign:'right',marginTop:4}}>
        14-day avg: {(vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(1)} {L('glasses')}/day
      </div>
    </div>
  );
}

export default function WaterSection(){
  const[water,setWater]=useState(()=>{
    const today=new Date().toISOString().slice(0,10);
    if(typeof localStorage!=='undefined'&&localStorage.getItem('nutryx:today:water:date')!==today) return 0;
    const v=typeof localStorage!=='undefined'?localStorage.getItem('nutryx:today:water'):null;
    try{ return v?JSON.parse(v):0; }catch{ return 0; }
  });
  const[history,setHistory]=useState([]);

  useEffect(()=>{
    db.getWaterHistory(90).then(data=>setHistory(data)).catch(()=>{});
  },[]);

  const update=async(v)=>{
    const today=new Date().toISOString().slice(0,10);
    // Update localStorage for cross-component sync
    if(typeof localStorage!=='undefined'){
      localStorage.setItem('nutryx:today:water', JSON.stringify(v));
      localStorage.setItem('nutryx:today:water:date', today);
    }
    // Save to DB
    await db.saveWater(today, v);
    // Update chart data
    setHistory(prev=>{
      const existing=prev.find(e=>e.date===today);
      if(existing) return prev.map(e=>e.date===today?{...e,amount:v}:e);
      return [...prev,{date:today,amount:v,at:new Date().toISOString()}];
    });
    setWater(v);
    window.dispatchEvent(new CustomEvent('nutryx:data-changed'));
  };

  const today=new Date().toISOString().slice(0,10);

  return(
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <Card>
        <SectionLabel>💧 {L('water')}</SectionLabel>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:36,fontWeight:900,color:T.accent}}>{water} <span style={{fontSize:16,color:T.textMuted}}>{L('glasses')}</span></div>
          <div style={{display:'flex',gap:8}}>
            <Btn onClick={()=>update(Math.max(0,water-1))} small color={T.surfaceHigh} style={{color:T.textMuted,border:`1px solid ${T.border}`}}>−1</Btn>
            <Btn onClick={()=>update(water+1)} small>+1</Btn>
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:12}}>
          {[1,2,3].map(n=>(
            <button key={n} onClick={()=>update(water+n)}
              style={{flex:1,padding:'8px',background:T.surfaceHigh,border:`1px solid ${T.border}`,borderRadius:10,color:T.accent,fontWeight:700,cursor:'pointer',fontSize:13}}>
              +{n}
            </button>
          ))}
        </div>
      </Card>

      {history.length>1&&<Card>
        <SectionLabel>📊 {L('water_history')}</SectionLabel>
        <WaterChart history={history}/>
      </Card>}

      <Card>
        <SectionLabel>{L('recent_log')}</SectionLabel>
        {[...history].sort((a,b)=>b.date<a.date?-1:1).slice(0,7).map(({date,amount})=>(
          <div key={date} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px dashed ${T.border}`}}>
            <span style={{color:T.textMuted,fontSize:13}}>{new Date(date+'T12:00:00').toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'})}</span>
            <span style={{color:T.accent,fontWeight:700}}>{amount} {L('glasses')}</span>
          </div>
        ))}
        {history.length===0&&<div style={{color:T.textMuted,fontSize:13}}>{L('no_entries')}</div>}
      </Card>
    </div>
  );
}

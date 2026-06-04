import React, { useState, useEffect } from 'react';
import { Card, SectionLabel, Btn, OutlineBtn, T, Ring } from '../lib/ui.jsx';
import { L } from '../lib/i18n.js';
import { store } from '../lib/store.js';

const PRESETS = [
  { label:'16:8', fast:16, eat:8 },
  { label:'18:6', fast:18, eat:6 },
  { label:'20:4', fast:20, eat:4 },
  { label:'OMAD', fast:23, eat:1 },
];

function fmt(ms){
  if(ms<=0)return'00:00:00';
  const s=Math.floor(ms/1000);
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;
  return[h,m,sec].map(v=>String(v).padStart(2,'0')).join(':');
}

export default function FastingTimer(){
  const[fasting,setFasting]=useState(()=>store.get('fasting')||null);
  const[now,setNow]=useState(Date.now());
  const[preset,setPreset]=useState(0);

  useEffect(()=>{
    const t=setInterval(()=>setNow(Date.now()),1000);
    return()=>clearInterval(t);
  },[]);

  const start=()=>{
    const f={start:new Date().toISOString(),hours:PRESETS[preset].fast,eat:PRESETS[preset].eat,label:PRESETS[preset].label};
    store.set('fasting',f); setFasting(f);
  };
  const stop=()=>{ store.set('fasting',null); setFasting(null); };

  if(!fasting){
    return(
      <Card>
        <SectionLabel>⏱ {L('fasting_title')}</SectionLabel>
        <div style={{display:'flex',gap:8,marginBottom:14}}>
          {PRESETS.map((p,i)=>(
            <button key={i} onClick={()=>setPreset(i)}
              style={{flex:1,padding:'10px 6px',background:preset===i?T.accent:T.surfaceHigh,color:preset===i?'#080d14':T.textMuted,
                border:`1px solid ${preset===i?T.accent:T.border}`,borderRadius:12,fontWeight:700,cursor:'pointer',fontSize:13}}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{textAlign:'center',color:T.textMuted,fontSize:13,marginBottom:12}}>
          Fast {PRESETS[preset].fast}h · Eating window {PRESETS[preset].eat}h
        </div>
        <Btn onClick={start} style={{width:'100%'}}>{L('start_fast')}</Btn>
        {store.get('fasting:log')?.length>0&&(
          <div style={{marginTop:12,fontSize:12,color:T.textMuted}}>
            {store.get('fasting:log').slice(0,3).map((l,i)=>(
              <div key={i} style={{padding:'4px 0',borderBottom:`1px solid ${T.border}`}}>
                {l.label} · {new Date(l.start).toLocaleDateString()} · {l.completed?'✅ Completed':'⏹ Stopped'}
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  }

  const startMs=new Date(fasting.start).getTime();
  const elapsed=now-startMs;
  const totalMs=fasting.hours*3600000;
  const remaining=Math.max(0,totalMs-elapsed);
  const pct=Math.min(100,(elapsed/totalMs)*100);
  const done=elapsed>=totalMs;
  const eatWindowEnds=totalMs+(fasting.eat*3600000);
  const inEatWindow=elapsed>=totalMs&&elapsed<eatWindowEnds;

  const handleStop=()=>{
    const log=store.get('fasting:log')||[];
    log.unshift({...fasting,end:new Date().toISOString(),completed:done});
    store.set('fasting:log',log.slice(0,20));
    stop();
  };

  return(
    <Card style={{border:`1px solid ${done?T.green:T.accent}44`}}>
      <SectionLabel>⏱ {L('fasting_title')} — {fasting.label}</SectionLabel>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12,padding:'8px 0'}}>
        <div style={{position:'relative',display:'inline-flex'}}>
          <Ring pct={pct} color={done?T.green:T.accent} size={120} stroke={10}/>
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
            <div style={{fontSize:11,color:T.textMuted,fontWeight:700}}>{done?L('eating_label'):L('fasting_label')}</div>
            <div style={{fontSize:18,fontWeight:900,color:done?T.green:T.accent,fontVariantNumeric:'tabular-nums'}}>
              {done&&inEatWindow?fmt(eatWindowEnds-elapsed):fmt(remaining)}
            </div>
            <div style={{fontSize:10,color:T.textMuted}}>{done?'window':'remaining'}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:16,fontSize:13,color:T.textMuted}}>
          <span>Started: {new Date(fasting.start).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
          <span>Goal: {fasting.hours}h fast</span>
        </div>
        {done&&<div style={{color:T.green,fontWeight:700,fontSize:15}}>🎉 {L('fast_complete')}</div>}
        <OutlineBtn onClick={handleStop} color={T.red} style={{width:'100%'}}>{done?L('end_eating'):L('break_fast')}</OutlineBtn>
      </div>
    </Card>
  );
}

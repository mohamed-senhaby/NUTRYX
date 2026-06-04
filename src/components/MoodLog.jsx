import React, { useState, useEffect } from 'react';
import { Card, SectionLabel, Btn, T } from '../lib/ui.jsx';
import { L } from '../lib/i18n.js';
import db from '../lib/db.js';

const ENERGY_LABELS=['😴 Drained','😕 Low','😐 Okay','😊 Good','⚡ Great'];
const MOOD_LABELS   =['😢 Down','😟 Meh','😐 Neutral','🙂 Happy','😄 Amazing'];

function MiniChart({history,key_,color}){
  if(!history||history.length<2)return null;
  const vals=history.slice(0,14).map(h=>h[key_]||3).reverse();
  const W=200,H=40,PAD=4;
  const pts=vals.map((v,i)=>{
    const x=PAD+(i/(vals.length-1))*(W-PAD*2);
    const y=PAD+(1-(v-1)/4)*(H-PAD*2);
    return`${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:H}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
      {vals.map((v,i)=>{
        const x=PAD+(i/(vals.length-1))*(W-PAD*2);
        const y=PAD+(1-(v-1)/4)*(H-PAD*2);
        return<circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={i===vals.length-1?3.5:2}
          fill={i===vals.length-1?color:T.surfaceHigh} stroke={color} strokeWidth={1.5}/>;
      })}
    </svg>
  );
}

export default function MoodLog(){
  const today=new Date().toISOString().slice(0,10);
  const[history,setHistory]=useState([]);
  const[loading,setLoading]=useState(true);
  const[energy,setEnergy]=useState(3);
  const[mood,setMood]=useState(3);
  const[note,setNote]=useState('');
  const[saved,setSaved]=useState(false);

  useEffect(()=>{
    db.getMoods(90).then(data=>{
      setHistory(data);
      const todayEntry=data.find(h=>h.date===today);
      if(todayEntry){ setEnergy(todayEntry.energy||3); setMood(todayEntry.mood||3); setNote(todayEntry.note||''); setSaved(true); }
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const save=async()=>{
    const entry={date:today,energy,mood,note,at:new Date().toISOString()};
    await db.saveMood(entry);
    setHistory(prev=>{ const next=prev.filter(h=>h.date!==today); return [entry,...next]; });
    setSaved(true);
    window.dispatchEvent(new CustomEvent('nutryx:data-changed'));
  };

  const last7=[...history].filter(h=>h.date<=today).slice(0,7);
  const avgEnergy=last7.length?+(last7.reduce((s,h)=>s+(h.energy||3),0)/last7.length).toFixed(1):null;
  const avgMood=last7.length?+(last7.reduce((s,h)=>s+(h.mood||3),0)/last7.length).toFixed(1):null;

  if(loading) return <Card><div style={{color:T.textMuted}}>Loading…</div></Card>;

  return(
    <Card>
      <SectionLabel>💭 {L('mood_title')}</SectionLabel>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,color:T.textMuted,fontWeight:700,marginBottom:8}}>{L('energy_label')} — {ENERGY_LABELS[energy-1]}</div>
        <div style={{display:'flex',gap:6}}>
          {[1,2,3,4,5].map(v=>(
            <button key={v} onClick={()=>{setEnergy(v);setSaved(false);}}
              style={{flex:1,padding:'10px 4px',background:energy===v?T.amber:T.surfaceHigh,color:energy===v?'#080d14':T.textMuted,
                border:`1px solid ${energy===v?T.amber:T.border}`,borderRadius:10,fontWeight:800,cursor:'pointer',fontSize:16}}>
              {['😴','😕','😐','😊','⚡'][v-1]}
            </button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,color:T.textMuted,fontWeight:700,marginBottom:8}}>{L('mood_label')} — {MOOD_LABELS[mood-1]}</div>
        <div style={{display:'flex',gap:6}}>
          {[1,2,3,4,5].map(v=>(
            <button key={v} onClick={()=>{setMood(v);setSaved(false);}}
              style={{flex:1,padding:'10px 4px',background:mood===v?T.purple:T.surfaceHigh,color:mood===v?'#fff':T.textMuted,
                border:`1px solid ${mood===v?T.purple:T.border}`,borderRadius:10,fontWeight:800,cursor:'pointer',fontSize:16}}>
              {['😢','😟','😐','🙂','😄'][v-1]}
            </button>
          ))}
        </div>
      </div>
      <input value={note} onChange={e=>{setNote(e.target.value);setSaved(false);}} placeholder="Optional note…"
        style={{width:'100%',background:T.surfaceHigh,border:`1px solid ${T.border}`,borderRadius:10,padding:'10px 12px',color:T.text,fontSize:14,outline:'none',marginBottom:10}}/>
      <Btn onClick={save} style={{width:'100%'}} color={saved?T.green:T.accent}>{saved?L('logged_today'):L('save_today')}</Btn>

      {avgEnergy&&(
        <div style={{marginTop:14}}>
          <div style={{display:'flex',gap:10,marginBottom:8}}>
            <div style={{flex:1,background:T.surfaceHigh,borderRadius:10,padding:'10px',textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:T.amber}}>{avgEnergy}</div>
              <div style={{fontSize:11,color:T.textMuted}}>7d avg {L('energy_label').toLowerCase()}</div>
            </div>
            <div style={{flex:1,background:T.surfaceHigh,borderRadius:10,padding:'10px',textAlign:'center'}}>
              <div style={{fontSize:20,fontWeight:800,color:T.purple}}>{avgMood}</div>
              <div style={{fontSize:11,color:T.textMuted}}>7d avg {L('mood_label').toLowerCase()}</div>
            </div>
          </div>
          <div style={{marginBottom:6}}>
            <div style={{fontSize:11,color:T.textMuted,marginBottom:2}}>{L('energy_label')} trend</div>
            <MiniChart history={history} key_="energy" color={T.amber}/>
          </div>
          <div>
            <div style={{fontSize:11,color:T.textMuted,marginBottom:2}}>{L('mood_label')} trend</div>
            <MiniChart history={history} key_="mood" color={T.purple}/>
          </div>
        </div>
      )}
    </Card>
  );
}

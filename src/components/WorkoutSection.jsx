import React, { useState, useEffect } from 'react';
import { Card, SectionLabel, T, Input, Btn, OutlineBtn } from '../lib/ui.jsx';
import { L } from '../lib/i18n.js';
import { store } from '../lib/store.js';
import db from '../lib/db.js';
import { ai } from '../lib/api.js';

const MET={light:3,moderate:5,hard:8};

export default function WorkoutSection({profile}){
  const[desc,setDesc]=useState('');
  const[mins,setMins]=useState('');
  const[intensity,setIntensity]=useState('moderate');
  const[entries,setEntries]=useState([]);
  const[loading,setLoading]=useState(true);
  const[templates,setTemplates]=useState(()=>store.get('workout:templates')||[]);
  const[prs,setPrs]=useState(()=>store.get('workout:prs')||{});
  const[prName,setPrName]=useState('');
  const[prWeight,setPrWeight]=useState('');
  const[prReps,setPrReps]=useState('');
  const[planGoal,setPlanGoal]=useState('');
  const[plan,setPlan]=useState(null);
  const[loadingPlan,setLoadingPlan]=useState(false);
  const[view,setView]=useState('log');

  useEffect(()=>{
    db.getWorkouts(100).then(data=>{ setEntries(data); setLoading(false); }).catch(()=>setLoading(false));
  },[]);

  const save=async()=>{
    if(!desc.trim()||!mins)return;
    const weight=parseFloat(profile?.weight)||70;
    const burn=Math.round((MET[intensity]||5)*weight*(parseInt(mins)||0)/60);
    const entry={desc:desc.trim(),mins:parseInt(mins)||0,intensity,burn,at:new Date().toISOString()};
    await db.saveWorkout(entry);
    setEntries(prev=>[entry,...prev].slice(0,100));
    setDesc('');setMins('');setIntensity('moderate');
    window.dispatchEvent(new CustomEvent('nutryx:workout-logged'));
  };

  const saveTemplate=()=>{
    if(!desc.trim())return;
    const t={id:Date.now(),name:desc.trim(),mins:parseInt(mins)||30,intensity};
    const next=[t,...templates].slice(0,20);
    store.set('workout:templates',next);setTemplates(next);
  };

  const loadTemplate=(t)=>{ setDesc(t.name);setMins(String(t.mins));setIntensity(t.intensity);setView('log'); };
  const removeTemplate=(id)=>{ const n=templates.filter(t=>t.id!==id);store.set('workout:templates',n);setTemplates(n); };

  const savePr=()=>{
    if(!prName.trim()||!prWeight)return;
    const entry={weight:parseFloat(prWeight),reps:parseInt(prReps)||1,date:new Date().toISOString().slice(0,10)};
    const updated={...prs,[prName.trim().toLowerCase()]:entry};
    store.set('workout:prs',updated);setPrs(updated);
    setPrName('');setPrWeight('');setPrReps('');
  };

  const generatePlan=async()=>{
    if(!planGoal.trim())return;
    setLoadingPlan(true);setPlan(null);
    try{
      const t=await ai(`5-day workout plan for: "${planGoal}". Weight: ${profile?.weight||70}kg. Return JSON:{"days":[{"day":"Monday","focus":"...","exercises":[{"name":"...","sets":3,"reps":"12","rest":"60s","tip":"..."}]}],"generalTips":["..."]}`,
        'Professional fitness coach. Return only valid JSON.');
      setPlan(JSON.parse(t));
    }catch(e){ console.warn('AI plan',e); }
    setLoadingPlan(false);
  };

  const today=new Date().toISOString().slice(0,10);
  const todayEntries=entries.filter(e=>e.at?.startsWith(today));
  const todayBurned=todayEntries.reduce((s,e)=>s+(e.burn||0),0);

  return(
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',gap:6,overflowX:'auto'}}>
        {[['log',`📋 ${L('log_btn')}`],['plan',`🤖 ${L('ai_plan')}`],['templates',`⚡ ${L('templates')}`],['prs',`🏆 ${L('prs')}`]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)}
            style={{flexShrink:0,padding:'8px 14px',background:view===v?T.accent:T.surfaceHigh,color:view===v?'#080d14':T.textMuted,
              border:`1px solid ${view===v?T.accent:T.border}`,borderRadius:20,fontWeight:700,cursor:'pointer',fontSize:13}}>
            {l}
          </button>
        ))}
      </div>

      {view==='log'&&<>
        <Card>
          <SectionLabel>{L('log_session')}</SectionLabel>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
            <Input value={desc} onChange={e=>setDesc(e.target.value)} placeholder={L('workout_placeholder')} style={{flex:1,minWidth:140}}/>
            <Input value={mins} onChange={e=>setMins(e.target.value)} placeholder={L('mins_placeholder')} type="number" style={{width:80}}/>
            <select value={intensity} onChange={e=>setIntensity(e.target.value)}
              style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,borderRadius:12,padding:'10px 12px',color:T.text}}>
              <option value="light">{L('intensity_light')}</option>
              <option value="moderate">{L('intensity_moderate')}</option>
              <option value="hard">{L('intensity_hard')}</option>
            </select>
          </div>
          <div style={{display:'flex',gap:8}}>
            <Btn onClick={save} style={{flex:1}}>{L('log_session')}</Btn>
            <OutlineBtn onClick={saveTemplate} disabled={!desc.trim()}>⭐ {L('save')}</OutlineBtn>
          </div>
          {todayBurned>0&&<div style={{marginTop:10,padding:'10px',background:`${T.purple}15`,borderRadius:10,color:T.purple,fontSize:14,fontWeight:700}}>🔥 {todayBurned} {L('kcal')} burned today</div>}
        </Card>
        <Card>
          <SectionLabel>{L('recent_sessions')}</SectionLabel>
          {loading&&<div style={{color:T.textMuted}}>Loading…</div>}
          {!loading&&entries.length===0&&<div style={{color:T.textMuted}}>{L('no_entries')}</div>}
          {entries.slice(0,8).map((s,i)=>(
            <div key={i} style={{padding:'8px 0',borderBottom:i<Math.min(entries.length,8)-1?`1px dashed ${T.border}`:'none'}}>
              <div style={{fontWeight:700,color:T.text}}>{s.desc}</div>
              <div style={{color:T.textMuted,fontSize:12,marginTop:2}}>
                {s.mins}min · {s.intensity}{s.burn?<span style={{color:T.purple}}> · 🔥{s.burn}{L('kcal')}</span>:''} · {new Date(s.at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </Card>
      </>}

      {view==='plan'&&<Card>
        <SectionLabel>🤖 {L('ai_plan')}</SectionLabel>
        <div style={{display:'flex',gap:10,marginBottom:14}}>
          <Input value={planGoal} onChange={e=>setPlanGoal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&generatePlan()} placeholder="e.g. lose weight, build muscle…" style={{flex:1}}/>
          <Btn onClick={generatePlan} disabled={loadingPlan||!planGoal.trim()} style={{flexShrink:0}}>{loadingPlan?'…':L('generate')}</Btn>
        </div>
        {loadingPlan&&<div style={{color:T.textMuted,textAlign:'center',padding:'16px 0'}}>✨ Building your plan…</div>}
        {plan&&<>
          {plan.days?.map((d,i)=>(
            <div key={i} style={{marginBottom:14,padding:'14px',background:T.surfaceHigh,borderRadius:12}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                <span style={{fontWeight:800,color:T.accent,fontSize:15}}>{d.day}</span>
                <span style={{fontSize:12,color:T.textMuted,background:`${T.accent}15`,padding:'3px 10px',borderRadius:20}}>{d.focus}</span>
              </div>
              {d.exercises?.map((ex,j)=>(
                <div key={j} style={{padding:'8px 0',borderBottom:j<d.exercises.length-1?`1px dashed ${T.border}`:'none'}}>
                  <div style={{fontWeight:700,color:T.text,fontSize:14}}>{ex.name}</div>
                  <div style={{fontSize:12,color:T.textMuted,marginTop:2}}>{ex.sets}×{ex.reps} · {ex.rest}{ex.tip&&<span style={{color:T.amber}}> · 💡{ex.tip}</span>}</div>
                </div>
              ))}
            </div>
          ))}
          {plan.generalTips?.length>0&&<div style={{padding:'12px',background:`${T.cyan}10`,borderRadius:10}}>
            <div style={{fontWeight:700,color:T.cyan,fontSize:11,marginBottom:8}}>💡 TIPS</div>
            {plan.generalTips.map((t,i)=><div key={i} style={{color:T.textMuted,fontSize:13,marginBottom:4}}>• {t}</div>)}
          </div>}
          <OutlineBtn onClick={()=>setPlan(null)} style={{width:'100%',marginTop:10}}>{L('close')}</OutlineBtn>
        </>}
      </Card>}

      {view==='templates'&&<Card>
        <SectionLabel>{L('workout_templates')}</SectionLabel>
        {templates.length===0&&<div style={{color:T.textMuted,fontSize:13}}>{L('no_entries')}</div>}
        {templates.map(t=>(
          <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px',background:T.surfaceHigh,borderRadius:12,marginBottom:8}}>
            <div><div style={{fontWeight:600,color:T.text}}>{t.name}</div><div style={{fontSize:12,color:T.textMuted}}>{t.mins}min · {t.intensity}</div></div>
            <div style={{display:'flex',gap:8}}>
              <Btn onClick={()=>loadTemplate(t)} small>Use</Btn>
              <OutlineBtn onClick={()=>removeTemplate(t.id)} color={T.red} small>✕</OutlineBtn>
            </div>
          </div>
        ))}
      </Card>}

      {view==='prs'&&<>
        <Card>
          <SectionLabel>{L('log_pr')}</SectionLabel>
          <Input value={prName} onChange={e=>setPrName(e.target.value)} placeholder="Exercise name (e.g. Bench Press)" style={{marginBottom:8}}/>
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <Input value={prWeight} onChange={e=>setPrWeight(e.target.value)} placeholder="Weight (kg)" type="number" style={{flex:1}}/>
            <Input value={prReps} onChange={e=>setPrReps(e.target.value)} placeholder="Reps" type="number" style={{flex:1}}/>
          </div>
          <Btn onClick={savePr} disabled={!prName.trim()||!prWeight} style={{width:'100%'}}>{L('save')}</Btn>
        </Card>
        <Card>
          <SectionLabel>{L('my_records')}</SectionLabel>
          {Object.keys(prs).length===0&&<div style={{color:T.textMuted,fontSize:13}}>{L('no_entries')}</div>}
          {Object.entries(prs).map(([name,pr])=>(
            <div key={name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${T.border}`}}>
              <div style={{fontWeight:600,color:T.text,textTransform:'capitalize'}}>{name}</div>
              <div style={{textAlign:'right'}}>
                <div style={{color:T.accent,fontWeight:800}}>{pr.weight}kg × {pr.reps} reps</div>
                <div style={{fontSize:11,color:T.textMuted}}>{pr.date}</div>
              </div>
            </div>
          ))}
        </Card>
      </>}
    </div>
  );
}

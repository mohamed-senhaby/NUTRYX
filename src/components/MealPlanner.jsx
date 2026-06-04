import React, { useState } from 'react';
import { Card, SectionLabel, T, Input, Btn, OutlineBtn, Tag } from '../lib/ui.jsx';
import { store } from '../lib/store.js';

const MEAL_TYPES = ['breakfast','lunch','dinner','snack'];
const MEAL_ICONS = {breakfast:'🌅',lunch:'☀️',dinner:'🌙',snack:'🍎'};

function dateLabel(dateStr) {
  const d = new Date(dateStr+'T12:00:00');
  const today = new Date().toISOString().slice(0,10);
  const tomorrow = new Date(Date.now()+86400000).toISOString().slice(0,10);
  if (dateStr===today) return 'Today';
  if (dateStr===tomorrow) return 'Tomorrow';
  return d.toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'});
}

function getNext7Days() {
  return Array.from({length:7},(_,i)=>new Date(Date.now()+i*86400000).toISOString().slice(0,10));
}

export default function MealPlanner({ onLogPlanned }) {
  const [plan, setPlan] = useState(()=>store.get('mealPlan')||{});
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0,10));
  const [adding, setAdding] = useState(null); // {type}
  const [form, setForm] = useState({name:'',cal:'',protein:'',carbs:'',fat:''});

  const days = getNext7Days();

  const savePlan = (next) => { setPlan(next); store.set('mealPlan',next); };

  const addItem = () => {
    if (!form.name.trim()||!form.cal) return;
    const item = { name:form.name.trim(), cal:Number(form.cal)||0, protein:Number(form.protein)||0, carbs:Number(form.carbs)||0, fat:Number(form.fat)||0, type:adding };
    const key = selectedDay;
    const current = plan[key]||[];
    savePlan({...plan,[key]:[...current,item]});
    setForm({name:'',cal:'',protein:'',carbs:'',fat:''}); setAdding(null);
  };

  const removeItem = (day, idx) => {
    const next = {...plan,[day]:(plan[day]||[]).filter((_,i)=>i!==idx)};
    if(!next[day].length) delete next[day];
    savePlan(next);
  };

  const logItem = (item) => { if(onLogPlanned) onLogPlanned(item); };

  const dayItems = plan[selectedDay]||[];
  const dayTotals = dayItems.reduce((a,m)=>({cal:a.cal+m.cal,protein:a.protein+(m.protein||0)}),{cal:0,protein:0});

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      {/* Day selector */}
      <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:4}}>
        {days.map(d=>{
          const hasPlan=(plan[d]||[]).length>0;
          return(
            <button key={d} onClick={()=>setSelectedDay(d)}
              style={{flexShrink:0,padding:'8px 12px',borderRadius:12,
                background:selectedDay===d?T.accent:T.surfaceHigh,
                color:selectedDay===d?'#080d14':T.textMuted,
                border:`1px solid ${selectedDay===d?T.accent:T.border}`,
                cursor:'pointer',fontSize:12,fontWeight:700,position:'relative'}}>
              {dateLabel(d)}
              {hasPlan&&<span style={{position:'absolute',top:4,right:4,width:6,height:6,borderRadius:'50%',background:T.green}}/>}
            </button>
          );
        })}
      </div>

      {/* Selected day plan */}
      <Card>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <SectionLabel style={{marginBottom:0}}>{dateLabel(selectedDay)}</SectionLabel>
          {dayItems.length>0&&<span style={{fontSize:12,color:T.textMuted}}>{dayTotals.cal} kcal · {dayTotals.protein.toFixed(0)}g P</span>}
        </div>

        {MEAL_TYPES.map(type=>{
          const items=dayItems.filter(m=>m.type===type);
          return(
            <div key={type} style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:T.textMuted,marginBottom:6}}>
                {MEAL_ICONS[type]} {type.charAt(0).toUpperCase()+type.slice(1)}
              </div>
              {items.map((item,i)=>{
                const globalIdx=dayItems.indexOf(item);
                return(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:T.surfaceHigh,borderRadius:10,marginBottom:6}}>
                    <div>
                      <div style={{color:T.text,fontSize:13,fontWeight:600}}>{item.name}</div>
                      <div style={{color:T.textMuted,fontSize:11}}>{item.cal}kcal · {item.protein}g P</div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <Btn onClick={()=>logItem(item)} small>Log</Btn>
                      <OutlineBtn onClick={()=>removeItem(selectedDay,globalIdx)} color={T.red} small>✕</OutlineBtn>
                    </div>
                  </div>
                );
              })}
              {adding?.type===type?(
                <div style={{background:T.accentGlow,border:`1px solid ${T.accentDim}`,borderRadius:12,padding:'12px',marginTop:6}}>
                  <Input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Food name" style={{marginBottom:8}}/>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:6,marginBottom:10}}>
                    {['cal','protein','carbs','fat'].map(k=>(
                      <input key={k} type="number" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={k}
                        style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:'8px',color:T.text,fontSize:13}}/>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <Btn onClick={addItem} style={{flex:1}}>Add</Btn>
                    <OutlineBtn onClick={()=>setAdding(null)}>Cancel</OutlineBtn>
                  </div>
                </div>
              ):(
                <button onClick={()=>setAdding({type})}
                  style={{width:'100%',padding:'8px',background:'transparent',border:`1px dashed ${T.border}`,borderRadius:10,color:T.textMuted,cursor:'pointer',fontSize:13,marginTop:4}}>
                  + Add {type}
                </button>
              )}
            </div>
          );
        })}
      </Card>

      {/* Projected macros for selected day */}
      {dayItems.length>0&&(
        <Card style={{padding:'12px 16px'}}>
          <SectionLabel>PROJECTED FOR {dateLabel(selectedDay).toUpperCase()}</SectionLabel>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {[
              {l:'Calories',v:dayTotals.cal,c:T.accent},
              {l:'Protein',v:dayTotals.protein.toFixed(0)+'g',c:T.cyan},
              {l:'Items',v:dayItems.length,c:T.textMuted},
            ].map(s=>(
              <div key={s.l} style={{flex:1,background:T.surfaceHigh,borderRadius:10,padding:'10px',textAlign:'center',minWidth:80}}>
                <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
                <div style={{fontSize:11,color:T.textMuted}}>{s.l}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Card, SectionLabel, T, Input, Btn, OutlineBtn, setTheme, setThemeSchedule, getCurrentTheme, getCurrentSchedule } from '../lib/ui.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import { L } from '../lib/i18n.js';
import db from '../lib/db.js';
import { store } from '../lib/store.js';
import { getAIProvider } from '../lib/api.js';
import { signOut } from '../lib/supabase.js';

function GeminiCard(){
  const[key,setKey]     = useState(()=>store.get('gemini:key')||'');
  const[model,setModel] = useState(()=>store.get('gemini:model')||'');
  const[models,setModels]= useState(()=>store.get('gemini:models')||[]);
  const[saved,setSaved] = useState(!!store.get('gemini:key'));
  const[loading,setLoading]=useState(false);
  const[testing,setTesting]=useState(false);
  const[testResult,setTestResult]=useState('');

  const provider = getAIProvider();

  const fetchModels=async()=>{
    if(!key.trim())return;
    setLoading(true);setTestResult('Fetching available models…');
    try{
      let list=[];
      for(const ver of ['v1','v1beta']){
        const res=await fetch(`https://generativelanguage.googleapis.com/${ver}/models?key=${key.trim()}`);
        if(!res.ok) continue;
        const d=await res.json();
        list=(d.models||[])
          .filter(m=>m.supportedGenerationMethods?.includes('generateContent'))
          .map(m=>({ id: m.name.replace('models/',''), label: m.displayName||m.name }));
        if(list.length) break;
      }
      if(!list.length){ setTestResult('❌ No models found. Check your API key.'); setLoading(false); return; }
      setModels(list);
      store.set('gemini:models',list);
      const flash=list.find(m=>m.id.includes('flash'))||list[0];
      if(!model||!list.find(m=>m.id===model)){ setModel(flash.id); store.set('gemini:model',flash.id); }
      store.set('gemini:key',key.trim()); setSaved(true);
      setTestResult(`✅ Found ${list.length} models. Selected: ${flash.id}`);
    }catch(e){ setTestResult('❌ '+e.message); }
    setLoading(false);
  };

  const testConnection=async()=>{
    const activeModel=model||store.get('gemini:model');
    if(!key.trim()||!activeModel)return;
    setTesting(true);setTestResult('🔄 Testing connection…');
    try{
      let ok=false,errMsg='';
      for(const ver of ['v1','v1beta']){
        const url=`https://generativelanguage.googleapis.com/${ver}/models/${activeModel}:generateContent?key=${key.trim()}`;
        const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:'Say exactly: OK'}]}],generationConfig:{maxOutputTokens:5}})});
        if(res.ok){ ok=true; break; }
        const t=await res.text();
        try{ errMsg=JSON.parse(t)?.error?.message||t.slice(0,150); }catch{ errMsg=t.slice(0,150); }
      }
      if(ok){
        setTestResult(`✅ Connection successful! Model "${activeModel}" is ready.`);
        store.set('gemini:key',key.trim());
        store.set('gemini:model',activeModel);
        setSaved(true);
      } else {
        if(errMsg.includes('quota')||errMsg.includes('RESOURCE_EXHAUSTED'))
          setTestResult('❌ Quota exceeded. Try a different model.');
        else
          setTestResult('❌ '+errMsg);
      }
    }catch(e){ setTestResult('❌ Network error: '+e.message); }
    setTesting(false);
  };

  const save=()=>{
    if(!key.trim()){ store.set('gemini:key',null); store.set('gemini:model',null); setSaved(false); setTestResult(''); return; }
    store.set('gemini:key',key.trim());
    store.set('gemini:model',model);
    setSaved(true); setTestResult('');
  };

  const clear=()=>{ setKey(''); setModels([]); setModel(''); store.set('gemini:key',null); store.set('gemini:model',null); store.set('gemini:models',[]); setSaved(false); setTestResult(''); };

  return(
    <Card style={{border:`2px solid ${saved?T.green:T.accent}44`}}>
      <SectionLabel>🤖 {L('ai_provider')}</SectionLabel>
      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <div style={{flex:1,padding:'10px 14px',background:provider==='gemini'?`${T.green}20`:T.surfaceHigh,border:`1px solid ${provider==='gemini'?T.green:T.border}`,borderRadius:12,textAlign:'center'}}>
          <div style={{fontSize:18}}>✨</div>
          <div style={{fontWeight:700,color:provider==='gemini'?T.green:T.text,fontSize:13}}>Gemini</div>
          <div style={{fontSize:11,color:T.textMuted}}>{provider==='gemini'?'Active':'Set key below'}</div>
        </div>
        <div style={{flex:1,padding:'10px 14px',background:provider==='anthropic'?`${T.accent}20`:T.surfaceHigh,border:`1px solid ${provider==='anthropic'?T.accent:T.border}`,borderRadius:12,textAlign:'center'}}>
          <div style={{fontSize:18}}>🔮</div>
          <div style={{fontWeight:700,color:provider==='anthropic'?T.accent:T.text,fontSize:13}}>Claude</div>
          <div style={{fontSize:11,color:T.textMuted}}>{provider==='anthropic'?'Active (server proxy)':'Fallback'}</div>
        </div>
      </div>

      <div style={{fontWeight:700,color:T.textMuted,fontSize:11,letterSpacing:1,marginBottom:8}}>GEMINI API KEY</div>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <input type="password" value={key} onChange={e=>{setKey(e.target.value);setSaved(false);setTestResult('');}}
          placeholder="Paste your Gemini API key…"
          style={{flex:1,background:T.surfaceHigh,border:`1px solid ${T.border}`,borderRadius:12,padding:'12px 16px',color:T.text,fontSize:14,outline:'none'}}/>
        {key&&<button onClick={clear} style={{background:'none',border:'none',color:T.textMuted,cursor:'pointer',fontSize:18,padding:'0 8px'}}>✕</button>}
      </div>

      <Btn onClick={fetchModels} disabled={loading||!key.trim()} style={{width:'100%',marginBottom:12}} color={T.cyan}>
        {loading?'Fetching…':'🔍 Fetch Available Models'}
      </Btn>

      {models.length>0&&<>
        <div style={{fontWeight:700,color:T.textMuted,fontSize:11,letterSpacing:1,marginBottom:8}}>SELECT MODEL ({models.length} available)</div>
        <select value={model} onChange={e=>{setModel(e.target.value);setSaved(false);setTestResult('');}}
          style={{width:'100%',background:T.surfaceHigh,border:`1px solid ${T.border}`,borderRadius:12,padding:'12px 16px',color:T.text,fontSize:14,marginBottom:12}}>
          {models.map(m=><option key={m.id} value={m.id}>{m.label||m.id}</option>)}
        </select>
        <div style={{display:'flex',gap:8}}>
          <Btn onClick={testConnection} disabled={testing||!model} color={T.cyan} style={{flex:1}}>
            {testing?'Testing…':'🧪 Test Connection'}
          </Btn>
          <Btn onClick={save} disabled={!model} style={{flex:1}}>{saved?'✓ Saved':'Save'}</Btn>
        </div>
      </>}

      {testResult&&<div style={{marginTop:10,padding:'10px 12px',background:testResult.startsWith('✅')?`${T.green}15`:testResult.startsWith('Fetch')?`${T.cyan}15`:`${T.red}15`,borderRadius:10,fontSize:13,color:testResult.startsWith('✅')?T.green:testResult.startsWith('Fetch')?T.cyan:T.red}}>{testResult}</div>}

      <div style={{marginTop:10,fontSize:12,color:T.textMuted}}>
        Get a free key at <b style={{color:T.accent}}>aistudio.google.com</b> → "Get API key" · Stored locally only.
      </div>
    </Card>
  );
}

function calcGoals(w,h,a,sex,activity,goal){
  const bmr=Math.round(10*w+6.25*h-5*a+(sex==='male'?5:-161));
  const mult={sedentary:1.2,light:1.375,moderate:1.55,active:1.725}[activity]||1.55;
  const tdee=Math.round(bmr*mult);
  return{cal:goal==='lose'?tdee-400:goal==='gain'?tdee+300:tdee,protein:Math.round(w*(goal==='gain'?2:1.6)),water:Math.max(6,Math.round(w*35/250))};
}

function ProfileEditor({profile,onProfileChange}){
  const[form,setForm]=useState({name:profile?.name||'',age:profile?.age||'',weight:profile?.weight||'',height:profile?.height||'',sex:profile?.sex||'male',goal:profile?.goal||'maintain',activity:profile?.activity||'moderate',calGoal:profile?.calGoal||2000,proteinGoal:profile?.proteinGoal||150,waterGoal:profile?.waterGoal||8,goalWeight:profile?.goalWeight||''});
  const[saved,setSaved]=useState(false);
  const set=(k,v)=>{setForm(f=>({...f,[k]:v}));setSaved(false);};
  const recalc=()=>{const w=parseFloat(form.weight)||75,h=parseFloat(form.height)||170,a=parseFloat(form.age)||25;const{cal,protein,water}=calcGoals(w,h,a,form.sex,form.activity,form.goal);setForm(f=>({...f,calGoal:cal,proteinGoal:protein,waterGoal:water}));setSaved(false);};
  const save=()=>{onProfileChange({...profile,...form,calGoal:Number(form.calGoal),proteinGoal:Number(form.proteinGoal),waterGoal:Number(form.waterGoal)});setSaved(true);};
  const goals=[{v:'lose',l:'🔥 Lose'},{v:'maintain',l:'⚖️ Maintain'},{v:'gain',l:'💪 Gain'}];
  const acts=[{v:'sedentary',l:'🪑 Sed.'},{v:'light',l:'🚶 Light'},{v:'moderate',l:'🏃 Mod.'},{v:'active',l:'⚡ Active'}];
  return(
    <Card>
      <SectionLabel>Profile & Goals</SectionLabel>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <Input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Your name"/>
        <div style={{display:'flex',gap:8}}>
          {['male','female'].map(s=><button key={s} onClick={()=>set('sex',s)} style={{flex:1,background:form.sex===s?T.accent:T.surfaceHigh,color:form.sex===s?'#080d14':T.text,border:`1px solid ${form.sex===s?T.accent:T.border}`,borderRadius:12,padding:'10px',fontWeight:700,cursor:'pointer'}}>{s==='male'?'Male':'Female'}</button>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          <Input value={form.age} onChange={e=>set('age',e.target.value)} placeholder="Age" type="number"/>
          <Input value={form.weight} onChange={e=>set('weight',e.target.value)} placeholder="kg" type="number"/>
          <Input value={form.height} onChange={e=>set('height',e.target.value)} placeholder="cm" type="number"/>
        </div>
        <div style={{display:'flex',gap:8}}>
          <Input value={form.goalWeight} onChange={e=>set('goalWeight',e.target.value)} placeholder="Goal weight (kg)" type="number" style={{flex:1}}/>
        </div>
        <div style={{fontWeight:700,color:T.textMuted,fontSize:11,letterSpacing:1}}>GOAL</div>
        <div style={{display:'flex',gap:8}}>{goals.map(g=><button key={g.v} onClick={()=>set('goal',g.v)} style={{flex:1,background:form.goal===g.v?T.accent:T.surfaceHigh,color:form.goal===g.v?'#080d14':T.text,border:`1px solid ${form.goal===g.v?T.accent:T.border}`,borderRadius:12,padding:'10px 6px',fontWeight:700,cursor:'pointer',fontSize:13}}>{g.l}</button>)}</div>
        <div style={{fontWeight:700,color:T.textMuted,fontSize:11,letterSpacing:1}}>ACTIVITY</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{acts.map(a=><button key={a.v} onClick={()=>set('activity',a.v)} style={{flex:1,background:form.activity===a.v?T.accent:T.surfaceHigh,color:form.activity===a.v?'#080d14':T.text,border:`1px solid ${form.activity===a.v?T.accent:T.border}`,borderRadius:12,padding:'10px 6px',fontWeight:700,cursor:'pointer',fontSize:12,minWidth:60}}>{a.l}</button>)}</div>
        <OutlineBtn onClick={recalc} style={{width:'100%'}}>🔄 Recalculate from stats</OutlineBtn>
        <div style={{fontWeight:700,color:T.textMuted,fontSize:11,letterSpacing:1}}>MANUAL ADJUST</div>
        {[{l:'Daily Calories',k:'calGoal',u:'kcal',step:50},{l:'Protein Goal',k:'proteinGoal',u:'g',step:5},{l:'Water Goal',k:'waterGoal',u:'glasses',step:1}].map(g=>(
          <div key={g.k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:`1px solid ${T.border}`}}>
            <span style={{color:T.text,fontWeight:600,fontSize:14}}>{g.l}</span>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <button onClick={()=>set(g.k,Math.max(0,Number(form[g.k])-g.step))} style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,width:30,height:30,cursor:'pointer',fontWeight:700}}>−</button>
              <span style={{color:T.accent,fontWeight:800,fontSize:15,minWidth:80,textAlign:'center'}}>{form[g.k]} {g.u}</span>
              <button onClick={()=>set(g.k,Number(form[g.k])+g.step)} style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,width:30,height:30,cursor:'pointer',fontWeight:700}}>+</button>
            </div>
          </div>
        ))}
        <Btn onClick={save} style={{width:'100%',marginTop:4}}>{saved?'✓ Saved!':'Save Changes'}</Btn>
      </div>
    </Card>
  );
}

function DietaryPrefsCard({profile,onProfileChange}){
  const prefs=profile?.dietaryPrefs||[];
  const OPTIONS=['Vegetarian','Vegan','Keto','Gluten-Free','Dairy-Free','Halal','Paleo','Low-Sodium'];
  const toggle=(p)=>{
    const key=p.toLowerCase();
    const next=prefs.includes(key)?prefs.filter(x=>x!==key):[...prefs,key];
    onProfileChange({...profile,dietaryPrefs:next});
  };
  return(
    <Card>
      <SectionLabel>🌿 {L('dietary_prefs')}</SectionLabel>
      <div style={{color:T.textMuted,fontSize:13,marginBottom:10}}>Selected preferences are included in AI meal suggestions and recipe filters.</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
        {OPTIONS.map(p=>{
          const key=p.toLowerCase(),active=prefs.includes(key);
          return<button key={p} onClick={()=>toggle(p)} style={{padding:'8px 14px',background:active?T.green:T.surfaceHigh,color:active?'#080d14':T.textMuted,border:`1px solid ${active?T.green:T.border}`,borderRadius:20,fontWeight:700,cursor:'pointer',fontSize:13}}>{active?'✓ ':''}{p}</button>;
        })}
      </div>
    </Card>
  );
}

function MacroRatiosCard({profile,onProfileChange}){
  const ratios=profile?.macroRatios||{protein:30,carbs:40,fat:30};
  const[r,setR]=useState(ratios);
  const total=r.protein+r.carbs+r.fat;
  const setVal=(k,v)=>{ const n={...r,[k]:Math.max(5,Math.min(80,v))}; setR(n); };
  const save=()=>{ onProfileChange({...profile,macroRatios:r}); };
  return(
    <Card>
      <SectionLabel>⚖️ MACRO RATIOS</SectionLabel>
      <div style={{color:T.textMuted,fontSize:13,marginBottom:12}}>Customize your carb/fat/protein split. Total must equal 100%.</div>
      {[{k:'protein',c:T.cyan,l:'Protein'},{k:'carbs',c:T.amber,l:'Carbs'},{k:'fat',c:T.red,l:'Fat'}].map(m=>(
        <div key={m.k} style={{marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <span style={{color:T.text,fontWeight:600}}>{m.l}</span>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={()=>setVal(m.k,r[m.k]-5)} style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,color:T.text,borderRadius:6,width:26,height:26,cursor:'pointer',fontWeight:700,fontSize:13}}>−</button>
              <span style={{color:m.c,fontWeight:800,minWidth:40,textAlign:'center'}}>{r[m.k]}%</span>
              <button onClick={()=>setVal(m.k,r[m.k]+5)} style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,color:T.text,borderRadius:6,width:26,height:26,cursor:'pointer',fontWeight:700,fontSize:13}}>+</button>
            </div>
          </div>
          <div style={{height:6,background:T.surfaceHigh,borderRadius:3,overflow:'hidden'}}>
            <div style={{width:`${r[m.k]}%`,height:'100%',background:m.c,transition:'width 0.3s'}}/>
          </div>
        </div>
      ))}
      <div style={{fontSize:12,color:total===100?T.green:T.red,fontWeight:700,marginBottom:10}}>Total: {total}% {total===100?'✓':'(must equal 100)'}</div>
      <Btn onClick={save} disabled={total!==100} style={{width:'100%'}}>Save Ratios</Btn>
    </Card>
  );
}

function KetoCard({profile,onProfileChange}){
  const on=profile?.netCarbs||false;
  return(
    <Card>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontWeight:700,color:T.text}}>🥑 Keto / Net Carbs Mode</div>
          <div style={{color:T.textMuted,fontSize:13,marginTop:2}}>Shows net carbs (carbs − fiber) instead of total carbs.</div>
        </div>
        <button onClick={()=>onProfileChange({...profile,netCarbs:!on})}
          style={{background:on?T.green:T.surfaceHigh,border:`1px solid ${on?T.green:T.border}`,borderRadius:20,padding:'8px 16px',fontWeight:700,cursor:'pointer',color:on?'#080d14':T.textMuted,fontSize:14}}>
          {on?'ON ✓':'OFF'}
        </button>
      </div>
    </Card>
  );
}

function ThemeCard(){
  const[theme,setThemeState]=useState(getCurrentTheme());
  const[schedule,setScheduleState]=useState(getCurrentSchedule());
  const toggle=()=>{const n=theme==='dark'?'light':'dark';setTheme(n);setThemeState(n);};
  const setS=(s)=>{setThemeSchedule(s);setScheduleState(s);};
  return(
    <Card>
      <SectionLabel>🎨 {L('appearance')}</SectionLabel>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div><div style={{color:T.text,fontWeight:600}}>Theme</div><div style={{color:T.textMuted,fontSize:13}}>{theme==='dark'?'Dark 🌙':'Light ☀️'}</div></div>
        <button onClick={toggle} style={{background:T.accent,color:'#080d14',border:'none',borderRadius:12,padding:'10px 18px',fontWeight:700,cursor:'pointer'}}>{theme==='dark'?'☀️ Light':'🌙 Dark'}</button>
      </div>
      <div style={{fontWeight:700,color:T.textMuted,fontSize:11,letterSpacing:1,marginBottom:8}}>AUTO SCHEDULE</div>
      <div style={{display:'flex',gap:8}}>
        {[['manual','Manual'],['system','Follow System'],['auto','Auto (7am–7pm)']].map(([v,l])=>(
          <button key={v} onClick={()=>setS(v)} style={{flex:1,padding:'8px 6px',background:schedule===v?T.accent:T.surfaceHigh,color:schedule===v?'#080d14':T.textMuted,border:`1px solid ${schedule===v?T.accent:T.border}`,borderRadius:10,fontWeight:700,cursor:'pointer',fontSize:11}}>{l}</button>
        ))}
      </div>
    </Card>
  );
}

function StreakFreezeCard(){
  const freezes=store.get('streaks:freeze')||{water:0,calories:0,workout:0};
  return(
    <Card>
      <SectionLabel>🧊 {L('streak_freezes')}</SectionLabel>
      <div style={{color:T.textMuted,fontSize:13,marginBottom:12}}>Freezes protect your streak when you miss a day. You earn 1 per streak type every Monday (max 2).</div>
      <div style={{display:'flex',gap:10}}>
        {[{icon:'💧',l:'Water',v:freezes.water||0},{icon:'🥗',l:'Calories',v:freezes.calories||0},{icon:'💪',l:'Workout',v:freezes.workout||0}].map(s=>(
          <div key={s.l} style={{flex:1,background:T.surfaceHigh,borderRadius:12,padding:'12px',textAlign:'center'}}>
            <div style={{fontSize:22}}>{s.icon}</div>
            <div style={{fontSize:24,fontWeight:800,color:s.v>0?T.cyan:T.textMuted}}>{s.v}🧊</div>
            <div style={{fontSize:11,color:T.textMuted}}>{s.l}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function NotificationCard(){
  const[perm,setPerm]=useState(typeof Notification!=='undefined'?Notification.permission:'default');
  const[waterMins,setWaterMins]=useState(store.get('notif:waterMins')||120);
  const[mealTimes,setMealTimes]=useState(store.get('notif:mealTimes')||['08:00','12:00','18:00']);
  const[saved,setSaved]=useState(false);
  const request=async()=>{ if(typeof Notification==='undefined')return; const r=await Notification.requestPermission(); setPerm(r); };
  const savePref=()=>{ store.set('notif:waterMins',waterMins); store.set('notif:mealTimes',mealTimes); setSaved(true); setTimeout(()=>setSaved(false),2000); };
  const toggle=(t)=>setMealTimes(prev=>prev.includes(t)?prev.filter(x=>x!==t):[...prev,t].sort());
  return(
    <Card>
      <SectionLabel>🔔 {L('reminders')}</SectionLabel>
      {perm!=='granted'&&<><div style={{color:T.textMuted,fontSize:13,marginBottom:8}}>Enable notifications to get water and meal reminders.</div><Btn onClick={request} style={{width:'100%'}}>Enable Notifications</Btn></>}
      {perm==='granted'&&<div style={{display:'flex',flexDirection:'column',gap:12}}>
        <div>
          <div style={{color:T.text,fontWeight:600,marginBottom:6}}>Water reminder every</div>
          <div style={{display:'flex',gap:8}}>{[60,90,120,180].map(m=><button key={m} onClick={()=>setWaterMins(m)} style={{flex:1,padding:'8px',background:waterMins===m?T.accent:T.surfaceHigh,color:waterMins===m?'#080d14':T.textMuted,border:`1px solid ${waterMins===m?T.accent:T.border}`,borderRadius:10,fontWeight:700,cursor:'pointer',fontSize:12}}>{m<60?`${m}m`:`${m/60}h`}</button>)}</div>
        </div>
        <div>
          <div style={{color:T.text,fontWeight:600,marginBottom:6}}>Meal reminders</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{['07:00','08:00','12:00','13:00','18:00','19:00'].map(t=><button key={t} onClick={()=>toggle(t)} style={{padding:'8px 12px',background:mealTimes.includes(t)?T.accent:T.surfaceHigh,color:mealTimes.includes(t)?'#080d14':T.textMuted,border:`1px solid ${mealTimes.includes(t)?T.accent:T.border}`,borderRadius:10,fontWeight:700,cursor:'pointer',fontSize:12}}>{t}</button>)}</div>
        </div>
        <Btn onClick={savePref} style={{width:'100%'}}>{saved?'✓ Saved!':'Save Preferences'}</Btn>
      </div>}
      {perm==='denied'&&<div style={{color:T.red,fontSize:13}}>Notifications blocked in browser settings.</div>}
    </Card>
  );
}

function DiaryExportCard(){
  const exportDiary=()=>{
    const meals=store.get('meals')||[];
    const today=new Date().toISOString().slice(0,10);
    const tm=meals.filter(m=>!m.date||m.date===today);
    const tot=tm.reduce((a,m)=>({cal:a.cal+m.cal,protein:a.protein+(m.protein||0),carbs:a.carbs+(m.carbs||0),fat:a.fat+(m.fat||0)}),{cal:0,protein:0,carbs:0,fat:0});
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>NUTRYX Diary ${today}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b;max-width:700px;margin:auto}h1{color:#2563eb}table{width:100%;border-collapse:collapse}th{background:#2563eb;color:#fff;padding:10px 12px;text-align:left}td{border-bottom:1px solid #e2e8f0;padding:10px 12px}.total{background:#f0f4ff;font-weight:bold}@media print{button{display:none}}</style></head><body><h1>NUTRYX Food Diary</h1><p>Date: ${today} · ${tm.length} entries</p><table><tr><th>Food</th><th>Meal</th><th>Cal</th><th>Protein</th><th>Carbs</th><th>Fat</th></tr>${tm.map(m=>`<tr><td>${m.name}</td><td>${m.type||'snack'}</td><td>${m.cal}</td><td>${(m.protein||0).toFixed(1)}g</td><td>${(m.carbs||0).toFixed(1)}g</td><td>${(m.fat||0).toFixed(1)}g</td></tr>`).join('')}<tr class="total"><td>TOTAL</td><td></td><td>${tot.cal}</td><td>${tot.protein.toFixed(1)}g</td><td>${tot.carbs.toFixed(1)}g</td><td>${tot.fat.toFixed(1)}g</td></tr></table></body></html>`;
    const w=window.open('','_blank');if(w){w.document.write(html);w.document.close();setTimeout(()=>w.print(),300);}
  };
  return(<Card><SectionLabel>📄 FOOD DIARY EXPORT</SectionLabel><div style={{color:T.textMuted,fontSize:13,marginBottom:10}}>Export today's food diary as a printable PDF to share with your dietitian.</div><Btn onClick={exportDiary} style={{width:'100%'}}>📄 Export Today's Diary</Btn></Card>);
}

function HealthImportCard(){
  const[status,setStatus]=useState('');const fileRef=React.useRef(null);
  const handleFile=async(e)=>{
    const file=e.target.files[0];if(!file)return;setStatus('Reading…');
    try{
      const text=await file.text();
      try{const obj=JSON.parse(text);if(obj.meals||obj.prefs){await db.importJSON(obj);window.dispatchEvent(new CustomEvent('nutryx:imported'));setStatus('✓ NUTRYX backup imported');return;}}catch{}
      const lines=text.trim().split('\n');
      const headers=lines[0].toLowerCase().split(',').map(h=>h.trim().replace(/"/g,''));
      const di=headers.findIndex(h=>h.includes('date')),wi=headers.findIndex(h=>h.includes('weight'));
      if(di<0||wi<0){setStatus('CSV needs "date" and "weight_kg" columns');return;}
      const hist=store.get('weight:history')||[];let added=0;
      lines.slice(1).forEach(l=>{const c=l.split(',').map(x=>x.trim().replace(/"/g,''));const d=c[di],w=parseFloat(c[wi]);if(d&&!isNaN(w)&&w>0){hist.push({value:Math.round(w*10)/10,at:new Date(d+'T12:00:00').toISOString()});added++;}});
      if(added>0){hist.sort((a,b)=>new Date(b.at)-new Date(a.at));store.set('weight:history',hist.slice(0,200));store.set('weight:last',hist[0]);window.dispatchEvent(new CustomEvent('nutryx:imported'));setStatus(`✓ Imported ${added} weight entries`);}
      else setStatus('No valid entries found');
    }catch{setStatus('Failed to parse file');}
    e.target.value='';
  };
  return(<Card><SectionLabel>📥 HEALTH DATA IMPORT</SectionLabel><div style={{color:T.textMuted,fontSize:13,marginBottom:10}}>Import a NUTRYX backup JSON, or CSV with <code style={{background:T.surfaceHigh,padding:'1px 4px',borderRadius:4}}>date,weight_kg</code> columns.</div><Btn onClick={()=>fileRef.current?.click()} style={{width:'100%'}}>📂 Choose File</Btn><input ref={fileRef} type="file" accept=".json,.csv" style={{display:'none'}} onChange={handleFile}/>{status&&<div style={{marginTop:8,fontSize:13,color:status.startsWith('✓')?T.green:T.red}}>{status}</div>}</Card>);
}

const SUPABASE_SQL = `-- Run this once in your Supabase SQL Editor

create table if not exists nutryx_backups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

create table if not exists nutryx_meals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date, type text, name text,
  cal int, protein real, carbs real, fat real,
  fiber real, sugar real, sodium real,
  created_at timestamptz default now()
);

create table if not exists nutryx_weights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null, value real not null,
  at timestamptz, created_at timestamptz default now()
);

create table if not exists nutryx_workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  description text, mins int, intensity text,
  burn int default 0, at timestamptz not null,
  created_at timestamptz default now()
);

create table if not exists nutryx_water (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null, amount int default 0,
  updated_at timestamptz default now(),
  unique(user_id, date)
);

create table if not exists nutryx_moods (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null, energy int, mood int, note text,
  unique(user_id, date)
);

create table if not exists nutryx_measurements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  at timestamptz, waist real, chest real, arms real, hips real,
  created_at timestamptz default now()
);

alter table nutryx_backups     enable row level security;
alter table nutryx_meals        enable row level security;
alter table nutryx_weights      enable row level security;
alter table nutryx_workouts     enable row level security;
alter table nutryx_water        enable row level security;
alter table nutryx_moods        enable row level security;
alter table nutryx_measurements enable row level security;

create policy "own" on nutryx_backups     for all using (auth.uid() = user_id);
create policy "own" on nutryx_meals        for all using (auth.uid() = user_id);
create policy "own" on nutryx_weights      for all using (auth.uid() = user_id);
create policy "own" on nutryx_workouts     for all using (auth.uid() = user_id);
create policy "own" on nutryx_water        for all using (auth.uid() = user_id);
create policy "own" on nutryx_moods        for all using (auth.uid() = user_id);
create policy "own" on nutryx_measurements for all using (auth.uid() = user_id);`;

function DatabaseCard(){
  const[showSQL,setShowSQL]=useState(false);
  const[syncing,setSyncing]=useState(false);
  const[status,setStatus]=useState('');
  const[stats,setStats]=useState(null);
  const[autoSync,setAutoSync]=useState(()=>store.get('supabase:autoSync')||false);

  React.useEffect(()=>{
    db.getStats().then(setStats).catch(()=>{});
  },[]);

  const copySQL=()=>{
    navigator.clipboard?.writeText(SUPABASE_SQL).then(()=>setStatus('✓ SQL copied to clipboard'));
  };

  const syncAll=async()=>{
    setSyncing(true);setStatus('Syncing all data…');
    try{
      const payload=await db.exportJSON();
      const{uploadBackup}=await import('../lib/supabase.js');
      const res=await uploadBackup(payload);
      if(res?.error)throw new Error(res.error.message||'Sync failed');
      setStatus(`✓ Synced ${payload.meals?.length||0} meals · ${payload.weights?.length||0} weights · ${payload.workouts?.length||0} workouts`);
    }catch(e){setStatus('❌ '+e.message);}
    setSyncing(false);
  };

  const toggleAutoSync=()=>{
    const next=!autoSync;
    setAutoSync(next);
    store.set('supabase:autoSync',next);
    setStatus(next?'✓ Auto-sync enabled':'✓ Auto-sync disabled');
    setTimeout(()=>setStatus(''),2000);
  };

  return(
    <Card style={{border:`1px solid ${T.accent}44`}}>
      <SectionLabel>☁️ SUPABASE</SectionLabel>

      {/* Stats */}
      {stats&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
          {[
            {l:'Meals',v:stats.mealCount,c:T.accent},
            {l:'Workouts',v:stats.workoutCount,c:T.purple},
            {l:'Weight entries',v:stats.weightEntries,c:T.green},
            {l:'Days tracked',v:stats.days,c:T.cyan},
            {l:'Total kcal',v:(stats.totalCal/1000).toFixed(1)+'k',c:T.amber},
            {l:'Mood days',v:stats.moodDays,c:T.red},
          ].map(s=>(
            <div key={s.l} style={{background:T.surfaceHigh,borderRadius:10,padding:'10px 8px',textAlign:'center'}}>
              <div style={{fontSize:16,fontWeight:800,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,color:T.textMuted}}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{color:T.textMuted,fontSize:13,marginBottom:12}}>
        All data syncs automatically to Supabase when <b>Auto-sync</b> is enabled, or manually with the button below.
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,padding:'12px',background:T.surfaceHigh,borderRadius:10}}>
        <div>
          <div style={{fontWeight:700,color:T.text}}>Auto-sync</div>
          <div style={{fontSize:11,color:T.textMuted}}>Sync on every change</div>
        </div>
        <button onClick={toggleAutoSync} style={{background:autoSync?T.green:T.surfaceHigh,border:`1px solid ${autoSync?T.green:T.border}`,borderRadius:20,padding:'8px 16px',fontWeight:700,cursor:'pointer',color:autoSync?'#080d14':T.textMuted}}>
          {autoSync?'ON ✓':'OFF'}
        </button>
      </div>

      <Btn onClick={syncAll} disabled={syncing} style={{width:'100%',marginBottom:10}} color={T.cyan}>
        {syncing?'Syncing…':'⬆️ Manual Sync Now'}
      </Btn>

      <OutlineBtn onClick={()=>setShowSQL(v=>!v)} style={{width:'100%',marginBottom:showSQL?10:0}}>
        {showSQL?'▲ Hide':'📋 Show Setup SQL'}
      </OutlineBtn>

      {showSQL&&(
        <div>
          <div style={{background:T.surfaceHigh,borderRadius:10,padding:'12px',fontFamily:'monospace',fontSize:11,color:T.textMuted,overflowX:'auto',maxHeight:160,overflow:'auto',marginBottom:8}}>
            {SUPABASE_SQL.split('\n').map((line,i)=><div key={i}>{line}</div>)}
          </div>
          <Btn onClick={copySQL} style={{width:'100%'}} color={T.green}>📋 Copy SQL</Btn>
          <div style={{fontSize:11,color:T.textMuted,marginTop:8}}>
            Paste in Supabase SQL Editor and run once.
          </div>
        </div>
      )}

      {status&&<div style={{marginTop:10,fontSize:13,color:status.startsWith('✓')?T.green:T.red}}>{status}</div>}
    </Card>
  );
}


function AccountCard({authUser, onSignOut}){
  const[busy,setBusy]=useState(false);

  const handleSignOut=async()=>{
    setBusy(true);
    try{ await signOut(); }catch(e){}
    onSignOut();
    setBusy(false);
  };

  return(
    <Card style={{border:`1px solid ${T.accent}33`}}>
      <SectionLabel>👤 ACCOUNT</SectionLabel>

      {authUser?(
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px',background:T.surfaceHigh,borderRadius:10}}>
          <div>
            <div style={{fontWeight:700,color:T.text,fontSize:14}}>{authUser.email}</div>
            <div style={{fontSize:11,color:T.green,marginTop:2}}>✓ Signed in</div>
          </div>
          <Btn onClick={handleSignOut} disabled={busy} color={T.red} style={{flexShrink:0}}>
            {busy?'…':'Sign Out'}
          </Btn>
        </div>
      ):(
        <div style={{padding:'12px',background:T.surfaceHigh,borderRadius:10}}>
          <div style={{color:T.textMuted,fontSize:13}}>Not signed in — running in local mode.</div>
        </div>
      )}
    </Card>
  );
}

const TABS=[
  {id:'profile', icon:'👤', label:'Profile'},
  {id:'ai',      icon:'🤖', label:'AI'},
  {id:'app',     icon:'⚙️',  label:'App'},
  {id:'data',    icon:'☁️',  label:'Data'},
];

export default function Settings({profile,onProfileChange,authUser,onSignOut}){
  const[tab,setTab]=useState('profile');
  return(
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {/* Tab bar */}
      <div style={{display:'flex',gap:6,background:T.surface,borderRadius:14,padding:4}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:'9px 4px',background:tab===t.id?T.accent:T.surfaceHigh,
              color:tab===t.id?'#080d14':T.textMuted,border:'none',borderRadius:10,
              fontWeight:700,cursor:'pointer',fontSize:11,display:'flex',flexDirection:'column',
              alignItems:'center',gap:2,transition:'background 0.2s'}}>
            <span style={{fontSize:16}}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab==='profile'&&<>
        <ProfileEditor profile={profile} onProfileChange={onProfileChange}/>
        <DietaryPrefsCard profile={profile} onProfileChange={onProfileChange}/>
        <MacroRatiosCard profile={profile} onProfileChange={onProfileChange}/>
        <KetoCard profile={profile} onProfileChange={onProfileChange}/>
      </>}

      {tab==='ai'&&<>
        <GeminiCard/>
      </>}

      {tab==='app'&&<>
        <ThemeCard/>
        <Card>
          <SectionLabel>{L('language')||'Language'}</SectionLabel>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{color:T.textMuted,fontSize:14}}>App language</div>
            <LanguageSelector/>
          </div>
        </Card>
        <NotificationCard/>
        <StreakFreezeCard/>
      </>}

      {tab==='data'&&<>
        <AccountCard authUser={authUser} onSignOut={onSignOut}/>
        <DatabaseCard/>
        <DiaryExportCard/>
        <HealthImportCard/>
      </>}
    </div>
  );
}

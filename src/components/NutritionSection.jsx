import React, { useState, useEffect, useRef } from 'react';
import { store } from '../lib/store.js';
import { L } from '../lib/i18n.js';
import { ai, lookupBarcode } from '../lib/api.js';
import BarcodeScanner from './BarcodeScanner.jsx';
import PhotoScanner from './PhotoScanner.jsx';
import ProductCard from './ProductCard.jsx';
import FoodSearch from './FoodSearch.jsx';
import RecipeManager from './RecipeManager.jsx';
import MealPlanner from './MealPlanner.jsx';
import { Card, Tag, Btn, OutlineBtn, Input, Ring, Hint, SectionLabel, T } from '../lib/ui.jsx';

const MEAL_TYPES_DEF=[{id:'breakfast',icon:'🌅'},{id:'lunch',icon:'☀️'},{id:'dinner',icon:'🌙'},{id:'snack',icon:'🍎'}];

function MacroBar({protein,carbs,fat}){
  const pC=protein*4,cC=carbs*4,fC=fat*9,tot=pC+cC+fC||1;
  return(
    <div>
      <div style={{display:'flex',height:10,borderRadius:6,overflow:'hidden',marginBottom:6}}>
        <div style={{width:`${pC/tot*100}%`,background:T.cyan}}/><div style={{width:`${cC/tot*100}%`,background:T.amber}}/><div style={{width:`${fC/tot*100}%`,background:T.red}}/>
      </div>
      <div style={{display:'flex',gap:10,fontSize:11,color:T.textMuted}}>
        <span><span style={{color:T.cyan,fontWeight:700}}>■</span> P {Math.round(pC/tot*100)}%</span>
        <span><span style={{color:T.amber,fontWeight:700}}>■</span> C {Math.round(cC/tot*100)}%</span>
        <span><span style={{color:T.red,fontWeight:700}}>■</span> F {Math.round(fC/tot*100)}%</span>
      </div>
    </div>
  );
}

function compressPhoto(dataUrl,size=80){
  return new Promise(res=>{
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement('canvas');c.width=size;c.height=size;
      const ctx=c.getContext('2d');
      const s=Math.min(img.width,img.height);
      ctx.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,size,size);
      res(c.toDataURL('image/jpeg',0.6));
    };
    img.src=dataUrl;
  });
}

// Recalculate macros from per100g + grams
function calcFromGrams(per100g, grams){
  const g = parseFloat(grams)||0;
  return {
    cal:     Math.round((per100g.cal     || 0) * g / 100),
    protein: +((per100g.protein  || 0) * g / 100).toFixed(1),
    carbs:   +((per100g.carbs    || 0) * g / 100).toFixed(1),
    fat:     +((per100g.fat      || 0) * g / 100).toFixed(1),
    fiber:   +((per100g.fiber    || 0) * g / 100).toFixed(1),
    sugar:   +((per100g.sugar    || 0) * g / 100).toFixed(1),
    sodium:  +((per100g.sodium   || 0) * g / 100).toFixed(1),
  };
}

// Inline edit — change grams only, macros recalculate automatically
function EditMealRow({meal, onSave, onCancel}){
  const[grams,setGrams]=useState(meal.grams||100);
  const calc=meal.per100g ? calcFromGrams(meal.per100g, grams) : null;

  const save=()=>{
    if(calc) onSave({...meal, grams, ...calc});
    else onSave({...meal, grams});
  };

  return(
    <div style={{background:T.surfaceHigh,borderRadius:12,padding:14,marginBottom:8}}>
      <div style={{fontWeight:700,color:T.text,fontSize:14,marginBottom:12}}>{meal.name}</div>

      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <button onClick={()=>setGrams(g=>Math.max(1,g-5))}
          style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,width:40,height:40,color:T.text,fontWeight:700,cursor:'pointer',fontSize:20}}>−</button>
        <input type="number" value={grams} onChange={e=>setGrams(Math.max(1,+e.target.value))}
          style={{flex:1,background:T.bg,border:`1px solid ${T.accent}`,borderRadius:10,padding:'10px',color:T.accent,fontWeight:900,fontSize:20,textAlign:'center',outline:'none'}}/>
        <button onClick={()=>setGrams(g=>g+5)}
          style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,width:40,height:40,color:T.text,fontWeight:700,cursor:'pointer',fontSize:20}}>+</button>
        <span style={{color:T.textMuted,fontWeight:700,fontSize:15}}>g</span>
      </div>

      {calc&&(
        <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
          <span style={{color:T.accent,fontWeight:800,fontSize:14}}>{calc.cal} kcal</span>
          <span style={{color:T.textMuted,fontSize:13}}>· P {calc.protein}g · C {calc.carbs}g · F {calc.fat}g</span>
        </div>
      )}

      <div style={{display:'flex',gap:8}}>
        <button onClick={save} style={{flex:1,background:T.accent,color:'#080d14',border:'none',borderRadius:10,padding:'11px',fontWeight:700,cursor:'pointer'}}>✓ Save</button>
        <button onClick={onCancel} style={{flex:1,background:'none',color:T.textMuted,border:`1px solid ${T.border}`,borderRadius:10,padding:'11px',fontWeight:700,cursor:'pointer'}}>Cancel</button>
      </div>
    </div>
  );
}

export default function NutritionSection({meals,allMeals=[],onAdd,onEdit,onDelete,profile,onBadge}){
  const[view,setView]=useState('log');
  const[mode,setMode]=useState('search');
  const[textInput,setTextInput]=useState('');
  const[busy,setBusy]=useState(false);
  const[aiResult,setAiResult]=useState(null);
  const[showBarcode,setShowBarcode]=useState(false);
  const[showPhoto,setShowPhoto]=useState(false);
  const[scanned,setScanned]=useState(null);
  const[scanType,setScanType]=useState('barcode');
  const[scanErr,setScanErr]=useState('');
  const[mealType,setMealType]=useState('snack');
  const[templates,setTemplates]=useState(store.get('templates')||[]);
  const[showMicro,setShowMicro]=useState(false);
  const[listening,setListening]=useState(false);
  const[mealPhotos,setMealPhotos]=useState(store.get('meal:photos')||{});
  const photoInputRef=useRef(null);
  const[pendingPhotoMealId,setPendingPhotoMealId]=useState(null);
  const[editingId,setEditingId]=useState(null);
  const[aiGrams,setAiGrams]=useState(100);

  const today=new Date().toISOString().slice(0,10);
  const[historyDate,setHistoryDate]=useState(today);
  const isToday=historyDate===today;
  const offsetDate=(d)=>{ const nd=new Date(historyDate+'T12:00:00'); nd.setDate(nd.getDate()+d); const s=nd.toISOString().slice(0,10); if(s<=today)setHistoryDate(s); };
  const displayMeals=isToday?meals:allMeals.filter(m=>m.date===historyDate);

  const netCarbs=profile.netCarbs||false;
  const customRatios=profile.macroRatios;
  const carbGoal=customRatios?Math.round((profile.calGoal||2000)*customRatios.carbs/100/4):250;
  const fatGoal=customRatios?Math.round((profile.calGoal||2000)*customRatios.fat/100/9):65;

  const totals=displayMeals.reduce((a,m)=>({
    cal:a.cal+m.cal,protein:a.protein+(m.protein||0),
    carbs:a.carbs+(m.carbs||0),fat:a.fat+(m.fat||0),
    fiber:a.fiber+(m.fiber||0),sugar:a.sugar+(m.sugar||0),sodium:a.sodium+(m.sodium||0),
  }),{cal:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0,sodium:0});
  const displayCarbs=netCarbs?Math.max(0,totals.carbs-totals.fiber):totals.carbs;

  const calLeft=Math.max(0,(profile.calGoal||2000)-totals.cal);
  const macroScore=Math.round((Math.min(totals.cal,profile.calGoal||2000)/(profile.calGoal||2000)*40)+(Math.min(totals.protein,profile.proteinGoal||150)/(profile.proteinGoal||150)*40)+((totals.fat<(profile.calGoal||2000)*0.35/9)?20:0));

  const analyzeText=async(input)=>{
    const txt=input||textInput;
    if(!txt.trim())return;
    setBusy(true);setAiResult(null);
    const prefs=profile.dietaryPrefs?.length?`Dietary restrictions: ${profile.dietaryPrefs.join(', ')}. `:'';
    try{
      const t=await ai(`${prefs}Analyze food:"${txt}". Return JSON with per-100g nutritional values and a typical serving size in grams:{"name":"...","per100g":{"cal":0,"protein":0,"carbs":0,"fat":0,"fiber":0},"defaultGrams":100,"insight":"..."}`);
      const parsed=JSON.parse(t);
      setAiResult(parsed);
      setAiGrams(parsed.defaultGrams||100);
    }catch{
      setAiResult({name:txt,per100g:{cal:333,protein:17,carbs:38,fat:13,fiber:3},defaultGrams:120,insight:'Balanced meal.'});
      setAiGrams(120);
    }
    setBusy(false);
  };

  const startVoice=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert('Voice input not supported in this browser');return;}
    const rec=new SR();
    const lang=localStorage.getItem('nutryx:lang')||'en';
    rec.lang=lang==='ar'?'ar-SA':lang==='de'?'de-DE':'en-US';
    rec.onstart=()=>setListening(true);
    rec.onend=()=>setListening(false);
    rec.onresult=(e)=>{ const txt=e.results[0][0].transcript; setTextInput(txt); setMode('text'); analyzeText(txt); };
    rec.onerror=()=>setListening(false);
    rec.start();
  };

  const handleBarcode=async(bc)=>{ setShowBarcode(false);setBusy(true);setScanErr('');setScanned(null);setScanType('barcode'); const r=await lookupBarcode(bc); if(r.found){setScanned(r);setMode('scan');onBadge&&onBadge('first_scan');}else{setScanErr(`Not found: ${bc}. Try Photo Scan!`);setMode('text');}setBusy(false); };
  const handlePhoto=async(r)=>{ setShowPhoto(false);setScanned({...r,source:'ai-photo',serving:r.serving||'1 serving',perServing:{cal:r.perServing?.cal||0,protein:r.perServing?.protein||0,carbs:r.perServing?.carbs||0,fat:r.perServing?.fat||0,fiber:r.perServing?.fiber||0,sugar:r.perServing?.sugar||0,sodium:r.perServing?.sodium||0}});setScanType('photo');setMode('scan');onBadge&&onBadge('first_scan'); };
  const saveTemplate=()=>{ if(!aiResult)return; const t=[...templates,{...aiResult,id:Date.now()}]; setTemplates(t);store.set('templates',t); };
  const addMeal=(m)=>{ onAdd({...m,type:mealType}); if(meals.length>=4)onBadge&&onBadge('meal_log5'); };

  // Meal photo attachment
  const attachPhoto=async(e)=>{
    const file=e.target.files[0]; if(!file||!pendingPhotoMealId)return;
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      const thumb=await compressPhoto(ev.target.result,80);
      const updated={...mealPhotos,[pendingPhotoMealId]:thumb};
      store.set('meal:photos',updated); setMealPhotos(updated);
      setPendingPhotoMealId(null);
    };
    reader.readAsDataURL(file);
    e.target.value='';
  };

  const MEAL_TYPES=MEAL_TYPES_DEF.map(mt=>({...mt,label:L(mt.id)}));
  const grouped=MEAL_TYPES.map(mt=>({...mt,items:displayMeals.filter(m=>m.type===mt.id||(mt.id==='snack'&&!m.type))})).filter(g=>g.items.length>0);
  const MODES=[{id:'search',l:`🔍 ${L('search_mode')}`},{id:'text',l:`✏️ ${L('ai_mode')}`},{id:'barcode',l:`📷 ${L('scan_mode')}`},{id:'photo',l:`📸 ${L('photo_mode')}`},{id:'recipe',l:`🍳 ${L('recipe_mode')}`}];
  const dietBadge=profile.dietaryPrefs?.length?profile.dietaryPrefs.slice(0,2).join(' · '):null;

  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <input ref={photoInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={attachPhoto}/>
      {showBarcode&&<BarcodeScanner onResult={handleBarcode} onClose={()=>setShowBarcode(false)}/>}
      {showPhoto&&<PhotoScanner onResult={handlePhoto} onClose={()=>setShowPhoto(false)}/>}

      {/* View toggle */}
      <div style={{display:'flex',gap:8}}>
        {[['log',`📋 ${L('log_food')}`],['plan',`📅 ${L('meal_plan')}`]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{flex:1,padding:'10px',background:view===v?T.accent:T.surfaceHigh,color:view===v?'#080d14':T.textMuted,border:`1px solid ${view===v?T.accent:T.border}`,borderRadius:12,fontWeight:700,cursor:'pointer',fontSize:14}}>{l}</button>
        ))}
      </div>

      {view==='plan'&&<MealPlanner onLogPlanned={(item)=>onAdd({...item,date:today,type:item.type||mealType})}/>}

      {view==='log'&&<>
        {/* Date navigator */}
        <Card style={{padding:'10px 14px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <button onClick={()=>offsetDate(-1)} style={{background:'none',border:'none',color:T.accent,fontSize:22,cursor:'pointer'}}>‹</button>
            <div style={{textAlign:'center'}}>
              <div style={{fontWeight:700,color:T.text,fontSize:14}}>{isToday?'Today':new Date(historyDate+'T12:00:00').toLocaleDateString('en',{weekday:'long',month:'short',day:'numeric'})}</div>
              {!isToday&&<button onClick={()=>setHistoryDate(today)} style={{background:'none',border:'none',color:T.accent,fontSize:12,cursor:'pointer'}}>Back to today</button>}
            </div>
            <button onClick={()=>offsetDate(1)} disabled={isToday} style={{background:'none',border:'none',color:isToday?T.border:T.accent,fontSize:22,cursor:'pointer'}}>›</button>
          </div>
        </Card>

        {/* Dietary preference indicator */}
        {dietBadge&&<div style={{fontSize:12,color:T.amber,padding:'6px 12px',background:`${T.amber}15`,borderRadius:8,border:`1px solid ${T.amber}33`}}>🌿 Dietary: {dietBadge}{profile.dietaryPrefs.length>2?` +${profile.dietaryPrefs.length-2} more`:''}</div>}

        {/* Net carbs indicator */}
        {netCarbs&&<div style={{fontSize:12,color:T.green,padding:'6px 12px',background:`${T.green}10`,borderRadius:8,border:`1px solid ${T.green}33`}}>🥑 Keto mode: showing net carbs (total − fiber)</div>}

        {/* Macro rings */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
          {[
            {l:L('calories'),v:totals.cal,g:profile.calGoal||2000,c:T.accent,u:L('kcal')},
            {l:L('protein'),v:totals.protein,g:profile.proteinGoal||150,c:T.cyan,u:'g'},
            {l:netCarbs?L('net_carbs_mode').split(':')[0]:L('carbs'),v:displayCarbs,g:carbGoal,c:T.amber,u:'g'},
            {l:L('fat'),v:totals.fat,g:fatGoal,c:T.red,u:'g'},
          ].map(m=>(
            <Card key={m.l} style={{textAlign:'center',padding:'12px 6px'}}>
              <div style={{display:'flex',justifyContent:'center'}}><Ring pct={Math.min(100,(m.v/m.g)*100)} color={m.c} size={60}/></div>
              <div style={{marginTop:6,fontSize:14,fontWeight:800,color:T.text}}>{Math.round(m.v)}<span style={{fontSize:9,color:T.textMuted}}>{m.u}</span></div>
              <div style={{fontSize:10,color:T.textMuted}}>{m.l}</div>
            </Card>
          ))}
        </div>

        {/* Macro bar */}
        {(totals.protein>0||totals.carbs>0||totals.fat>0)&&<Card style={{padding:'14px 16px'}}><div style={{fontWeight:700,color:T.textMuted,fontSize:11,letterSpacing:1,marginBottom:10}}>{L('macro_breakdown')}</div><MacroBar protein={totals.protein} carbs={displayCarbs} fat={totals.fat}/></Card>}

        {/* Micronutrients */}
        {(totals.fiber>0||totals.sugar>0||totals.sodium>0)&&(
          <Card style={{padding:'12px 16px'}}>
            <button onClick={()=>setShowMicro(v=>!v)} style={{background:'none',border:'none',color:T.textMuted,cursor:'pointer',fontWeight:700,fontSize:11,letterSpacing:1,width:'100%',textAlign:'left',padding:0}}>
              🔬 {L('micronutrients')} {showMicro?'▲':'▼'}
            </button>
            {showMicro&&<div style={{display:'flex',gap:10,marginTop:10,flexWrap:'wrap'}}>
              {[{l:'Fiber',v:totals.fiber,u:'g',c:T.green},{l:'Sugar',v:totals.sugar,u:'g',c:T.amber},{l:'Sodium',v:totals.sodium,u:'mg',c:T.red}].map(m=>(
                <div key={m.l} style={{flex:1,minWidth:80,background:T.surfaceHigh,borderRadius:10,padding:'10px',textAlign:'center'}}>
                  <div style={{fontSize:16,fontWeight:800,color:m.c}}>{m.v.toFixed(m.u==='mg'?0:1)}<span style={{fontSize:10,color:T.textMuted}}>{m.u}</span></div>
                  <div style={{fontSize:11,color:T.textMuted}}>{m.l}</div>
                </div>
              ))}
            </div>}
          </Card>
        )}

        {/* Score + remaining */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <Card style={{padding:'12px 14px'}}><div style={{fontSize:10,color:T.textMuted,fontWeight:700,letterSpacing:1}}>{L('macro_score')}</div><div style={{fontSize:30,fontWeight:900,color:macroScore>70?T.green:macroScore>40?T.amber:T.red,marginTop:4}}>{macroScore}<span style={{fontSize:13,color:T.textMuted}}>/100</span></div></Card>
          <Card style={{padding:'12px 14px'}}><div style={{fontSize:10,color:T.textMuted,fontWeight:700,letterSpacing:1}}>{L('remaining')}</div><div style={{fontSize:30,fontWeight:900,color:T.accent,marginTop:4}}>{calLeft}<span style={{fontSize:13,color:T.textMuted}}>{L('kcal')}</span></div></Card>
        </div>

        {isToday&&<>
          {/* Meal type */}
          <Card style={{padding:'12px 14px'}}>
            <div style={{fontWeight:700,color:T.textMuted,fontSize:11,letterSpacing:1,marginBottom:10}}>{L('log_as')}</div>
            <div style={{display:'flex',gap:8}}>
              {MEAL_TYPES.map(mt=><button key={mt.id} onClick={()=>setMealType(mt.id)} style={{flex:1,background:mealType===mt.id?T.accent:T.surfaceHigh,color:mealType===mt.id?'#080d14':T.textMuted,border:`1px solid ${mealType===mt.id?T.accent:T.border}`,borderRadius:10,padding:'8px 4px',fontSize:11,fontWeight:700,cursor:'pointer'}}>{mt.icon}<div style={{marginTop:2}}>{mt.label}</div></button>)}
            </div>
          </Card>

          {mode==='recipe'&&<RecipeManager onAdd={addMeal}/>}

          {mode!=='recipe'&&<Card>
            <div style={{display:'flex',gap:6,overflowX:'auto',marginBottom:14}}>
              {MODES.map(b=><button key={b.id} onClick={()=>{ if(b.id==='barcode')setShowBarcode(true); else if(b.id==='photo')setShowPhoto(true); else{setMode(b.id);setScanned(null);setAiResult(null);} }}
                style={{background:mode===b.id&&!['barcode','photo'].includes(b.id)?T.accent:'transparent',color:mode===b.id&&!['barcode','photo'].includes(b.id)?'#080d14':T.textMuted,border:`1px solid ${T.border}`,borderRadius:20,padding:'6px 12px',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
                {b.l}
              </button>)}
            </div>

            {busy&&<div style={{textAlign:'center',padding:'20px 0',color:T.textMuted}}>🔍 Looking up…</div>}
            {scanErr&&!busy&&<div style={{padding:'12px',background:`${T.red}15`,borderRadius:10,color:T.red,fontSize:14,marginBottom:12}}>{scanErr}</div>}

            {mode==='search'&&!scanned&&<FoodSearch onAdd={addMeal} profile={profile}/>}

            {mode==='text'&&!busy&&!scanned&&(
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input value={textInput} onChange={e=>setTextInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&analyzeText()} placeholder="Describe your meal…"
                  style={{flex:1,background:T.surfaceHigh,border:`1px solid ${T.border}`,borderRadius:12,padding:'13px 16px',color:T.text,fontSize:16,outline:'none'}}/>
                <button onClick={()=>analyzeText()} style={{background:T.accent,color:'#080d14',border:'none',borderRadius:12,padding:'13px 18px',fontWeight:700,cursor:'pointer'}}>Go</button>
                <button onClick={startVoice} title="Voice input"
                  style={{background:listening?`${T.red}22`:T.surfaceHigh,border:`1px solid ${listening?T.red:T.border}`,borderRadius:12,padding:'13px 14px',cursor:'pointer',fontSize:18,color:listening?T.red:T.textMuted}}>
                  {listening?'🔴':'🎤'}
                </button>
              </div>
            )}

            {aiResult&&mode==='text'&&(()=>{
              const p100=aiResult.per100g||{cal:aiResult.cal||0,protein:aiResult.protein||0,carbs:aiResult.carbs||0,fat:aiResult.fat||0,fiber:aiResult.fiber||0};
              const calc=calcFromGrams(p100,aiGrams);
              return(
              <div style={{marginTop:14,padding:'14px',background:T.accentGlow,borderRadius:12,border:`1px solid ${T.accentDim}`}}>
                <div style={{fontWeight:700,color:T.text,fontSize:15,marginBottom:10}}>{aiResult.name}</div>

                {/* Grams input */}
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:11,color:T.textMuted,fontWeight:700,marginBottom:6}}>HOW MANY GRAMS?</div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <button onClick={()=>setAiGrams(g=>Math.max(1,g-10))} style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,borderRadius:8,width:36,height:36,color:T.text,fontWeight:700,cursor:'pointer',fontSize:18}}>−</button>
                    <input type="number" value={aiGrams} onChange={e=>setAiGrams(Math.max(1,+e.target.value))}
                      style={{flex:1,background:T.surfaceHigh,border:`1px solid ${T.accent}`,borderRadius:10,padding:'8px',color:T.accent,fontWeight:900,fontSize:18,textAlign:'center',outline:'none'}}/>
                    <button onClick={()=>setAiGrams(g=>g+10)} style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,borderRadius:8,width:36,height:36,color:T.text,fontWeight:700,cursor:'pointer',fontSize:18}}>+</button>
                    <span style={{color:T.textMuted,fontWeight:700}}>g</span>
                  </div>
                  <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
                    {[50,100,150,200,250].map(g=>(
                      <button key={g} onClick={()=>setAiGrams(g)}
                        style={{padding:'4px 10px',background:aiGrams===g?T.accent:T.surfaceHigh,color:aiGrams===g?'#080d14':T.textMuted,border:`1px solid ${aiGrams===g?T.accent:T.border}`,borderRadius:20,fontSize:12,fontWeight:700,cursor:'pointer'}}>
                        {g}g
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calculated macros */}
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                  <Tag color={T.accent}>{calc.cal} kcal</Tag>
                  <Tag color={T.cyan}>{calc.protein}g P</Tag>
                  <Tag color={T.amber}>{netCarbs?Math.max(0,calc.carbs-calc.fiber):calc.carbs}g {netCarbs?'net C':'C'}</Tag>
                  <Tag color={T.red}>{calc.fat}g F</Tag>
                </div>
                <div style={{fontSize:11,color:T.textMuted,marginBottom:10}}>Per 100g: {p100.cal} kcal · {p100.protein}g P · {p100.carbs}g C · {p100.fat}g F</div>

                {aiResult.insight&&<div style={{fontSize:13,color:T.textMuted,fontStyle:'italic',marginBottom:12}}>💡 {aiResult.insight}</div>}
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>{addMeal({...aiResult,...calc,per100g:p100,grams:aiGrams});setAiResult(null);setTextInput('');setAiGrams(100);}}
                    style={{flex:1,background:T.accent,color:'#080d14',border:'none',borderRadius:12,padding:'12px',fontWeight:700,cursor:'pointer'}}>{L('add_to_log')}</button>
                  <button onClick={saveTemplate} style={{background:'transparent',border:`1px solid ${T.textMuted}55`,color:T.textMuted,borderRadius:12,padding:'12px 16px',cursor:'pointer'}}>⭐</button>
                </div>
              </div>
              );
            })()}
            {scanned&&!busy&&<ProductCard product={scanned} scanType={scanType} onAdd={(m)=>{addMeal(m);setScanned(null);setMode('search');}} onRescan={()=>{setScanned(null);scanType==='photo'?setShowPhoto(true):setShowBarcode(true);}}/>}
          </Card>}

          {/* Quick log templates */}
          {templates.length>0&&<Card><SectionLabel>⭐ {L('quick_log')}</SectionLabel>
            {templates.map(t=>(
              <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px',background:T.surfaceHigh,borderRadius:12,marginBottom:8}}>
                <div><div style={{fontWeight:600,color:T.text,fontSize:14}}>{t.name}</div><div style={{fontSize:12,color:T.textMuted}}>{t.cal}kcal · {t.protein}g P</div></div>
                <div style={{display:'flex',gap:8}}>
                  <Btn onClick={()=>addMeal(t)} small>+ Log</Btn>
                  <OutlineBtn onClick={()=>{const n=templates.filter(x=>x.id!==t.id);setTemplates(n);store.set('templates',n);}} color={T.red} small>✕</OutlineBtn>
                </div>
              </div>
            ))}
          </Card>}
        </>}

        {/* Log grouped by meal type */}
        {grouped.length>0&&<Card>
          <SectionLabel>{isToday?L('todays_log'):new Date(historyDate+'T12:00:00').toLocaleDateString(localStorage.getItem('nutryx:lang')||'en',{weekday:'long',month:'short',day:'numeric'}).toUpperCase()}</SectionLabel>
          {grouped.map(g=>(
            <div key={g.id} style={{marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:T.textMuted,marginBottom:8}}>{g.icon} {g.label.toUpperCase()}</div>
              {g.items.map((m,i)=>(
                <div key={m.id||i}>
                  {editingId===m.id?(
                    <EditMealRow meal={m}
                      onSave={(updated)=>{ onEdit&&onEdit(updated); setEditingId(null); }}
                      onCancel={()=>setEditingId(null)}/>
                  ):(
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<g.items.length-1?`1px solid ${T.border}`:'none',gap:8}}>
                      {mealPhotos[m.id]&&<img src={mealPhotos[m.id]} alt="" style={{width:36,height:36,borderRadius:8,objectFit:'cover',flexShrink:0}}/>}
                      <div style={{flex:1,overflow:'hidden'}}>
                        <div style={{color:T.text,fontWeight:600,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.name}</div>
                        {m.grams&&<div style={{fontSize:11,color:T.textMuted}}>{m.grams}g</div>}
                      </div>
                      <div style={{display:'flex',gap:4,flexShrink:0,alignItems:'center'}}>
                        <Tag color={T.accent}>{m.cal}kcal</Tag>
                        <Tag color={T.cyan}>{m.protein}g P</Tag>
                        {m.id&&<button onClick={()=>setEditingId(m.id)} title="Edit" style={{background:'none',border:'none',color:T.textMuted,cursor:'pointer',fontSize:14,padding:'4px'}}>✏️</button>}
                        {m.id&&<button onClick={()=>onDelete&&onDelete(m.id)} title="Delete" style={{background:'none',border:'none',color:T.red,cursor:'pointer',fontSize:14,padding:'4px'}}>🗑️</button>}
                        {isToday&&m.id&&<button onClick={()=>{setPendingPhotoMealId(m.id);photoInputRef.current?.click();}} title="Photo" style={{background:'none',border:'none',color:T.textMuted,cursor:'pointer',fontSize:14,padding:'4px'}}>📷</button>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div style={{fontSize:11,color:T.textMuted,marginTop:6,textAlign:'right'}}>{g.items.reduce((s,m)=>s+m.cal,0)} kcal · {g.items.reduce((s,m)=>s+(m.protein||0),0).toFixed(0)}g P</div>
            </div>
          ))}
        </Card>}
        {displayMeals.length===0&&!isToday&&<div style={{textAlign:'center',padding:'40px 0',color:T.textMuted}}><div style={{fontSize:36,marginBottom:8}}>📅</div>No meals logged on this day.</div>}
      </>}
    </div>
  );
}

import React, { useState } from 'react';
import { store } from '../lib/store.js';
import { ai, lookupBarcode } from '../lib/api.js';
import BarcodeScanner from './BarcodeScanner.jsx';
import PhotoScanner from './PhotoScanner.jsx';
import ProductCard from './ProductCard.jsx';
import FoodSearch from './FoodSearch.jsx';
import { Card, Tag, Btn, OutlineBtn, Input, Ring, Hint, SectionLabel, T } from '../lib/ui.jsx';
import { L } from '../lib/i18n.js';

export default function NutritionSection({meals,onAdd,profile,onBadge}){
  const[mode,setMode]=useState("search"),[textInput,setTextInput]=useState(""),[busy,setBusy]=useState(false);
  const[aiResult,setAiResult]=useState(null),[showBarcode,setShowBarcode]=useState(false),[showPhoto,setShowPhoto]=useState(false);
  const[scanned,setScanned]=useState(null),[scanType,setScanType]=useState("barcode"),[scanErr,setScanErr]=useState("");
  const[templates,setTemplates]=useState(store.get("templates")||[]);
  const totals=meals.reduce((a,m)=>({cal:a.cal+m.cal,protein:a.protein+m.protein,carbs:a.carbs+m.carbs,fat:a.fat+m.fat}),{cal:0,protein:0,carbs:0,fat:0});
  const calLeft=Math.max(0,(profile.calGoal||2000)-totals.cal);
  const macroScore=Math.round((Math.min(totals.cal,profile.calGoal||2000)/(profile.calGoal||2000)*40)+(Math.min(totals.protein,profile.proteinGoal||150)/(profile.proteinGoal||150)*40)+((totals.fat<(profile.calGoal||2000)*0.35/9)?20:0));
  const analyzeText=async()=>{if(!textInput.trim())return;setBusy(true);setAiResult(null);
    try{const t=await ai(`Analyze meal:"${textInput}". Return JSON:{"name":"...","cal":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"insight":"one health tip"}`);setAiResult(JSON.parse(t));}
    catch{setAiResult({name:textInput,cal:400,protein:20,carbs:45,fat:15,fiber:3,insight:"Balanced meal."});}setBusy(false);};
  const handleBarcode=async(bc)=>{setShowBarcode(false);setBusy(true);setScanErr("");setScanned(null);setScanType("barcode");
    const r=await lookupBarcode(bc);if(r.found){setScanned(r);setMode("scan");onBadge&&onBadge("first_scan");}else{setScanErr(`Not found: ${bc}. Try Photo Scan!`);setMode("text");}setBusy(false);};
  const handlePhoto=async(r)=>{setShowPhoto(false);store.set(`food:n:${(r.name||"").toLowerCase().replace(/\s+/g,"-")}`,{...r,source:"ai-photo",savedAt:Date.now()});
    setScanned({...r,source:"ai-photo",serving:r.serving||"1 serving",perServing:{cal:r.perServing?.cal||0,protein:r.perServing?.protein||0,carbs:r.perServing?.carbs||0,fat:r.perServing?.fat||0,fiber:r.perServing?.fiber||0,sugar:r.perServing?.sugar||0,sodium:r.perServing?.sodium||0}});
    setScanType("photo");setMode("scan");onBadge&&onBadge("first_scan");};
  const saveTemplate=()=>{if(!aiResult)return;const t=[...templates,{...aiResult,id:Date.now()}];setTemplates(t);store.set("templates",t);};
  const addMeal=(m)=>{onAdd(m);if(meals.length>=4)onBadge&&onBadge("meal_log5");};
  const MODES=[{id:"search",l:"🔍 Search"},{id:"text",l:"✏️ AI"},{id:"barcode",l:"📷 Scan"},{id:"photo",l:"📸 Photo"}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {showBarcode&&<BarcodeScanner onResult={handleBarcode} onClose={()=>setShowBarcode(false)}/>} 
      {showPhoto&&<PhotoScanner onResult={handlePhoto} onClose={()=>setShowPhoto(false)}/>} 
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
        {[{l:"Calories",v:totals.cal,g:profile.calGoal||2000,c:T.accent,u:"kcal"},{l:"Protein",v:totals.protein,g:profile.proteinGoal||150,c:T.cyan,u:"g"},{l:"Carbs",v:totals.carbs,g:250,c:T.amber,u:"g"},{l:"Fat",v:totals.fat,g:65,c:T.red,u:"g"}].map(m=>(
          <Card key={m.l} style={{textAlign:"center",padding:"12px 6px"}}>
            <div style={{display:"flex",justifyContent:"center"}}><Ring pct={Math.min(100,(m.v/m.g)*100)} color={m.c} size={60}/></div>
            <div style={{marginTop:6,fontSize:14,fontWeight:800,color:T.text}}>{m.v}<span style={{fontSize:9,color:T.textMuted}}>{m.u}</span></div>
            <div style={{fontSize:10,color:T.textMuted}}>{m.l}</div>
          </Card>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <Card style={{padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{fontSize:10,color:T.textMuted,fontWeight:700,letterSpacing:1}}>MACRO SCORE</div>
            <Hint title="Macro Score" icon="📊" color={T.accent}>A score out of 100 based on how close you are to your calorie, protein and fat goals today. Above 70 is great, above 40 is good progress!</Hint>
          </div>
          <div style={{fontSize:30,fontWeight:900,color:macroScore>70?T.green:macroScore>40?T.amber:T.red,marginTop:4}}>{macroScore}<span style={{fontSize:13,color:T.textMuted}}>/100</span></div>
        </Card>
        <Card style={{padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{fontSize:10,color:T.textMuted,fontWeight:700,letterSpacing:1}}>REMAINING</div>
            <Hint title="Calories Remaining" icon="🔥" color={T.accent}>How many more calories you can eat today before reaching your daily goal. Try to end the day close to zero.</Hint>
          </div>
          <div style={{fontSize:30,fontWeight:900,color:T.accent,marginTop:4}}>{calLeft}<span style={{fontSize:13,color:T.textMuted}}>kcal</span></div>
        </Card>
      </div>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{display:"flex",gap:8,overflowX:"auto",flex:1}}>
            {MODES.map(b=><button key={b.id} onClick={()=>{if(b.id==="barcode")setShowBarcode(true);else if(b.id==="photo")setShowPhoto(true);else{setMode(b.id);setScanned(null);setAiResult(null);}}}
              style={{background:mode===b.id&&b.id!=="barcode"&&b.id!=="photo"?T.accent:"transparent",color:mode===b.id&&b.id!=="barcode"&&b.id!=="photo"?"#080d14":T.textMuted,border:`1px solid ${T.border}`,borderRadius:20,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all 0.2s",whiteSpace:"nowrap",flexShrink:0}}>{b.l}</button>)}
          </div>
          <Hint title="How to Add Food" icon="🥗" color={T.accent} style={{marginLeft:8,flexShrink:0}}>
            {"🔍 Search DB — search 300,000+ foods by name\n✏️ AI — describe any meal in plain words\n📷 Barcode — scan the barcode on any package\n📸 Photo — take a photo of the package or nutrition label"}
          </Hint>
        </div>
        {busy&&<div style={{textAlign:"center",padding:"20px 0",color:T.textMuted}}><div style={{fontSize:28,marginBottom:8}}>🔍</div>Looking up…</div>}
        {scanErr&&!busy&&<div style={{padding:"12px",background:`${T.red}15`,border:`1px solid ${T.red}44`,borderRadius:10,color:T.red,fontSize:14,marginBottom:12}}>{scanErr}</div>}
        {mode==="search"&&!scanned&&<FoodSearch onAdd={addMeal} profile={profile}/>} 
        {mode==="text"&&!busy&&!scanned&&<div style={{display:"flex",gap:10}}>
          <Input value={textInput} onChange={e=>setTextInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyzeText()} placeholder="Describe your meal…"/>
          <Btn onClick={analyzeText} style={{flexShrink:0}}>Go</Btn>
        </div>}
        {aiResult&&mode==="text"&&<div style={{marginTop:14,padding:"14px",background:T.accentGlow,borderRadius:12,border:`1px solid ${T.accentDim}`}}>
          <div style={{fontWeight:700,color:T.text,fontSize:15,marginBottom:8}}>{aiResult.name}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}><Tag color={T.accent}>{aiResult.cal}kcal</Tag><Tag color={T.cyan}>{aiResult.protein}g P</Tag><Tag color={T.amber}>{aiResult.carbs}g C</Tag><Tag color={T.red}>{aiResult.fat}g F</Tag></div>
          {aiResult.insight&&<div style={{fontSize:13,color:T.textMuted,fontStyle:"italic",marginBottom:12}}>💡 {aiResult.insight}</div>}
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>{addMeal(aiResult);setAiResult(null);setTextInput("");}} style={{flex:1}}>Add to Log</Btn>
            <OutlineBtn onClick={saveTemplate}>⭐</OutlineBtn>
          </div>
        </div>}
        {scanned&&!busy&&<ProductCard product={scanned} scanType={scanType} onAdd={(m)=>{addMeal(m);setScanned(null);setMode("search");}} onRescan={()=>{setScanned(null);scanType==="photo"?setShowPhoto(true):setShowBarcode(true);}}/>}
      </Card>
      {templates.length>0&&<Card><SectionLabel>⭐ QUICK LOG</SectionLabel>
        {templates.map(t=>(
          <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px",background:T.surfaceHigh,borderRadius:12,marginBottom:8}}>
            <div><div style={{fontWeight:600,color:T.text,fontSize:14}}>{t.name}</div><div style={{fontSize:12,color:T.textMuted,marginTop:2}}>{t.cal}kcal · {t.protein}g P</div></div>
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={()=>addMeal(t)} small>+ Log</Btn>
              <OutlineBtn onClick={()=>{const nt=templates.filter(x=>x.id!==t.id);setTemplates(nt);store.set("templates",nt);}} color={T.red} small>✕</OutlineBtn>
            </div>
          </div>
        ))}
      </Card>}
      {meals.length>0&&<Card><SectionLabel>TODAY'S LOG</SectionLabel>
        {meals.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i<meals.length-1?`1px solid ${T.border}`:"none"}}>
            <span style={{color:T.text,fontWeight:600,fontSize:14,flex:1,marginRight:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span>
            <div style={{display:"flex",gap:6,flexShrink:0}}><Tag color={T.accent}>{m.cal}kcal</Tag><Tag color={T.cyan}>{m.protein}g P</Tag></div>
          </div>
        ))}
      </Card>}
    </div>
  );
}

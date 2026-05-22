import React, { useState } from 'react';
import { ai } from '../lib/api.js';
import { Card, Hint, Ring, Tag, Btn, T, SectionLabel } from '../lib/ui.jsx';
import { L } from '../lib/i18n.js';

export default function HomeSection({profile,today,streaks,badges}){
  const[report,setReport]=useState(null),[loadingR,setLoadingR]=useState(false);
  const[sug,setSug]=useState(null),[loadingS,setLoadingS]=useState(false);
  const calLeft=Math.max(0,(profile.calGoal||2000)-today.cal);
  const calPct=Math.min(100,Math.round((today.cal/(profile.calGoal||2000))*100));
  const protPct=Math.min(100,Math.round((today.protein/(profile.proteinGoal||150))*100));
  const watPct=Math.min(100,Math.round((today.water/(profile.waterGoal||8))*100));
  const hour=new Date().getHours();
  const greet = hour < 12 ? "Good morning" : (hour < 17 ? "Good afternoon" : "Good evening");
  const getReport=async()=>{setLoadingR(true);setReport(null);
    try{const t=await ai(`User: goal=${profile.goal}, calGoal=${profile.calGoal}, proteinGoal=${profile.proteinGoal}. Today: cal=${today.cal}, protein=${today.protein}g, water=${today.water} glasses. Streaks: water=${streaks.water}, cal=${streaks.calories}. Return JSON:{"score":85,"scoreLabel":"Great day!","wins":["...","..."],"improvements":["..."],"tomorrowPlan":"...","motivationalQuote":"..."}`,"You are a personal health coach. Be specific and encouraging. Return only valid JSON.");setReport(JSON.parse(t));}
    catch{setReport({score:75,scoreLabel:"Good progress!",wins:["Staying consistent"],improvements:["Drink more water"],tomorrowPlan:"Hit your protein goal",motivationalQuote:"Every step counts."});}setLoadingR(false);};
  const getSug=async()=>{setLoadingS(true);setSug(null);
    try{const t=await ai(`${calLeft} kcal remaining. Protein so far: ${today.protein}g, goal: ${profile.proteinGoal}g. Suggest 3 meals/snacks fitting remaining macros. Return JSON:{"suggestions":[{"name":"...","cal":0,"protein":0,"why":"..."},{"name":"...","cal":0,"protein":0,"why":"..."},{"name":"...","cal":0,"protein":0,"why":"..."}]}`,"You are a nutrition expert. Return only valid JSON.");setSug(JSON.parse(t));}
    catch{setSug({suggestions:[{name:"Greek yogurt + berries",cal:180,protein:15,why:"High protein, low cal"},{name:"Tuna wrap",cal:350,protein:30,why:"Great protein boost"},{name:"Cottage cheese",cal:120,protein:14,why:"Easy and filling"}]});}setLoadingS(false);};
  const BADGES=[{id:"first_scan",icon:"📷",name:"First Scan"},{id:"streak3",icon:"🔥",name:"On Fire"},{id:"streak7",icon:"⚡",name:"Week Warrior"},{id:"water_goal",icon:"💧",name:"Hydrated"},{id:"protein_goal",icon:"💪",name:"Protein Pro"},{id:"weight_log",icon:"⚖️",name:"Tracked"},{id:"workout_done",icon:"🏋️",name:"Crushed It"},{id:"meal_log5",icon:"🥗",name:"Food Diary"}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card style={{background:`linear-gradient(135deg,${T.accentDim},${T.surface})`,border:`1px solid ${T.accent}33`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontWeight:800,fontSize:22,color:T.text}}>{greet}{profile.name?`, ${profile.name}`:""}! 👋</div>
            <div style={{color:T.textMuted,fontSize:13,marginTop:4}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
          </div>
          <Hint title="Home Dashboard" icon="🏠" color={T.accent}>Your daily summary. All numbers reset at midnight. Tap any tab at the bottom to track food, workouts, water or weight.</Hint>
        </div>
        <div style={{display:"flex",gap:10,marginTop:16,flexWrap:"wrap"}}>
          {[{l:"Calories",v:today.cal,g:profile.calGoal||2000,u:"kcal",c:T.accent},{l:"Protein",v:today.protein,g:profile.proteinGoal||150,u:"g",c:T.cyan},{l:"Water",v:today.water,g:profile.waterGoal||8,u:"gl",c:T.accent}].map(m=>(
            <div key={m.l} style={{flex:1,minWidth:90,background:`${m.c}15`,borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:22,fontWeight:800,color:m.c}}>{m.v}<span style={{fontSize:11,color:T.textMuted}}>/{m.g}{m.u}</span></div>
              <div style={{fontSize:12,color:T.textMuted,marginTop:2}}>{m.l}</div>
            </div>
          ))}
        </div>
      </Card>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[{l:"Calories",pct:calPct,c:T.accent},{l:"Protein",pct:protPct,c:T.cyan},{l:"Hydration",pct:watPct,c:T.accent}].map(m=>(
          <Card key={m.l} style={{textAlign:"center",padding:"14px 8px"}}>
            <div style={{display:"flex",justifyContent:"center"}}><Ring pct={m.pct} color={m.c} size={70}/></div>
            <div style={{marginTop:6,fontSize:16,fontWeight:800,color:T.text}}>{m.pct}%</div>
            <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{m.l}</div>
          </Card>
        ))}
      </div>
      <div style={{display:"flex",gap:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",marginBottom:8}}>
          <div style={{fontWeight:700,color:T.textMuted,fontSize:11,letterSpacing:1.2}}>🔥 STREAKS</div>
          <Hint title="Streaks" icon="🔥" color={T.amber}>A streak counts how many days in a row you hit your goal. Log water, calories and workouts every day to keep your streaks alive!</Hint>
        </div>
      </div>
      <div style={{display:"flex",gap:10}}>
        {[{icon:"💧",l:"Water",v:streaks.water,c:T.accent},{icon:"🥗",l:"Calories",v:streaks.calories,c:T.cyan},{icon:"💪",l:"Workout",v:streaks.workout,c:T.purple}].map(s=>(
          <div key={s.l} style={{flex:1,background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px 10px",textAlign:"center"}}>
            <div style={{fontSize:24}}>{s.icon}</div>
            <div style={{fontSize:22,fontWeight:800,color:s.c,marginTop:4}}>{s.v}<span style={{fontSize:14}}>🔥</span></div>
            <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:sug?14:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontWeight:700,color:T.cyan,fontSize:13,letterSpacing:1}}>🍽️ WHAT CAN I EAT?</div>
            <Hint title="Meal Suggestions" icon="🍽️" color={T.cyan}>Based on your remaining calories and protein for today, AI suggests 3 specific meals or snacks that fit perfectly into your macros.</Hint>
          </div>
          <Btn onClick={getSug} disabled={loadingS} small color={T.cyan}>{loadingS?"…":`${calLeft} kcal left`}</Btn>
        </div>
        {loadingS&&<div style={{color:T.textMuted,fontSize:13,paddingTop:10}}>Finding meals for your macros…</div>}
        {sug&&sug.suggestions?.map((s,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px",background:T.surfaceHigh,borderRadius:12,marginBottom:8}}>
            <div><div style={{fontWeight:700,color:T.text,fontSize:14}}>{s.name}</div><div style={{color:T.textMuted,fontSize:12,marginTop:2}}>💡 {s.why}</div></div>
            <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}><div style={{color:T.accent,fontWeight:800}}>{s.cal}kcal</div><div style={{color:T.cyan,fontSize:12}}>{s.protein}g P</div></div>
          </div>
        ))}
      </Card>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:report?14:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontWeight:700,color:T.accent,fontSize:13,letterSpacing:1}}>✦ AI DAILY REPORT</div>
            <Hint title="AI Daily Report" icon="✦" color={T.accent}>AI analyzes everything you did today — food, water, workouts — and gives you a health score, highlights your wins, suggests improvements, and plans tomorrow's focus.</Hint>
          </div>
          <Btn onClick={getReport} disabled={loadingR} small>{loadingR?"…":"Generate"}</Btn>
        </div>
        {loadingR&&<div style={{color:T.textMuted,fontSize:13,paddingTop:10}}>Analyzing your day…</div>}
        {report&&<>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14,padding:"14px",background:T.accentGlow,borderRadius:12}}>
            <div style={{fontSize:48,fontWeight:900,color:T.accent,lineHeight:1}}>{report.score}</div>
            <div><div style={{fontWeight:800,color:T.text,fontSize:18}}>{report.scoreLabel}</div><div style={{color:T.textMuted,fontSize:13}}>Today's health score</div></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div style={{background:`${T.green}10`,borderRadius:12,padding:"12px"}}><div style={{fontWeight:700,color:T.green,fontSize:11,marginBottom:8}}>✓ WINS</div>{report.wins?.map((w,i)=><div key={i} style={{color:T.textMuted,fontSize:13,marginBottom:4}}>• {w}</div>)}</div>
            <div style={{background:`${T.amber}10`,borderRadius:12,padding:"12px"}}><div style={{fontWeight:700,color:T.amber,fontSize:11,marginBottom:8}}>↑ IMPROVE</div>{report.improvements?.map((w,i)=><div key={i} style={{color:T.textMuted,fontSize:13,marginBottom:4}}>• {w}</div>)}</div>
          </div>
          {report.tomorrowPlan&&<div style={{padding:"12px",background:`${T.accent}10`,borderRadius:10,marginBottom:10}}><div style={{fontWeight:700,color:T.accent,fontSize:11,marginBottom:4}}>📅 TOMORROW</div><div style={{color:T.textMuted,fontSize:13}}>{report.tomorrowPlan}</div></div>}
          {report.motivationalQuote&&<div style={{fontStyle:"italic",color:T.textMuted,fontSize:13,textAlign:"center",padding:"8px 0"}}>"{report.motivationalQuote}"</div>}
        </>}
      </Card>
      <div>
        <SectionLabel>🏆 ACHIEVEMENTS</SectionLabel>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {BADGES.map(b=>(
            <div key={b.id} style={{background:badges[b.id]?T.surface:T.surfaceHigh,border:`1px solid ${badges[b.id]?T.accent:T.border}`,borderRadius:14,padding:"14px 8px",textAlign:"center",opacity:badges[b.id]?1:0.4,transition:"all 0.3s"}}>
              <div style={{fontSize:26}}>{b.icon}</div>
              <div style={{fontSize:11,fontWeight:700,color:badges[b.id]?T.text:T.textMuted,marginTop:6}}>{b.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { ai } from '../lib/api.js';
import { Card, Hint, Ring, Tag, Btn, OutlineBtn, T, SectionLabel } from '../lib/ui.jsx';
import { store } from '../lib/store.js';
import { L, isRTL } from '../lib/i18n.js';
import FastingTimer from './FastingTimer.jsx';
import MoodLog from './MoodLog.jsx';

function bmiCategory(b){ return b<18.5?{l:'Underweight',c:T.amber}:b<25?{l:'Normal',c:T.green}:b<30?{l:'Overweight',c:T.amber}:{l:'Obese',c:T.red}; }

function CalorieBarChart({data,calGoal}){
  const max=Math.max(...data.map(d=>d.cal),calGoal,1);
  return(
    <div>
      <div style={{display:'flex',gap:3,alignItems:'flex-end',height:72}}>
        {data.map((d,i)=>{
          const h=Math.max(d.cal>0?3:0,Math.round((d.cal/max)*64));
          const isToday=i===data.length-1,hit=d.cal>=(calGoal||2000)*0.9;
          return(
            <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
              <div title={`${d.date}: ${d.cal} kcal`} style={{width:'100%',height:h,background:isToday?T.accent:hit?T.green:`${T.accent}33`,borderRadius:'3px 3px 0 0'}}/>
              <div style={{fontSize:8,color:T.textMuted,overflow:'hidden',width:'100%',textAlign:'center'}}>{d.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{borderTop:`1px dashed ${T.border}`,marginTop:4,paddingTop:4,display:'flex',justifyContent:'space-between'}}>
        <span style={{fontSize:10,color:T.textMuted}}>14-day history</span>
        <span style={{fontSize:10,color:T.textMuted}}>Goal: {calGoal} kcal</span>
      </div>
    </div>
  );
}

function WeeklySummary({weeklyData,profile}){
  const last7=weeklyData.slice(-7).filter(d=>d.cal>0);
  if(last7.length<2)return null;
  const avg=Math.round(last7.reduce((s,d)=>s+d.cal,0)/last7.length);
  const onTrack=last7.filter(d=>d.cal>=(profile.calGoal||2000)*0.9&&d.cal<=(profile.calGoal||2000)*1.15).length;
  const trend=last7[last7.length-1].cal-last7[0].cal;
  return(
    <Card>
      <SectionLabel>📊 {L('week_in_review')}</SectionLabel>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {[{l:L('avg_calories'),v:`${avg}`,u:L('kcal'),c:T.accent},{l:L('on_track'),v:`${onTrack}/${last7.length}`,u:'d',c:T.green},{l:L('trend'),v:`${trend>0?'+':''}${trend}`,u:L('kcal'),c:trend<0?T.green:trend>200?T.red:T.amber}].map(s=>(
          <div key={s.l} style={{background:T.surfaceHigh,borderRadius:12,padding:'12px 10px',textAlign:'center'}}>
            <div style={{fontSize:18,fontWeight:900,color:s.c}}>{s.v}<span style={{fontSize:10,color:T.textMuted}}> {s.u}</span></div>
            <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function GoalProgress({profile,weeklyData}){
  const goalWeight=parseFloat(profile.goalWeight);
  const currentWeight=parseFloat(store.get('weight:last')?.value||profile.weight);
  if(!goalWeight||!currentWeight||Math.abs(goalWeight-currentWeight)<0.5)return null;
  const diff=Math.abs(currentWeight-goalWeight);
  const last7=weeklyData.slice(-7).filter(d=>d.cal>0);
  if(last7.length<3)return null;
  const avgCal=last7.reduce((s,d)=>s+d.cal,0)/last7.length;
  const dailyDelta=(profile.calGoal||2000)-avgCal;
  if(Math.abs(dailyDelta)<30)return null;
  const weeksNeeded=Math.max(1,Math.round((diff*7700)/Math.abs(dailyDelta*7)));
  const target=new Date(Date.now()+weeksNeeded*7*86400000).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'});
  const onTrack=currentWeight>goalWeight?dailyDelta>0:dailyDelta<0;
  return(
    <Card style={{border:`1px solid ${onTrack?T.green:T.amber}44`}}>
      <SectionLabel>🎯 {L('goal_progress')}</SectionLabel>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div style={{fontSize:13,color:T.textMuted,marginBottom:4}}>
            {currentWeight > goalWeight ? '📉 Losing' : '📈 Gaining'} · {diff.toFixed(1)} kg to go
          </div>
          <div style={{fontSize:18,fontWeight:800,color:onTrack?T.green:T.amber}}>
            ~{weeksNeeded} week{weeksNeeded!==1?'s':''}
          </div>
          <div style={{fontSize:12,color:T.textMuted}}>Est. {target}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:12,color:T.textMuted}}>Current</div>
          <div style={{fontSize:22,fontWeight:800,color:T.text}}>{currentWeight} kg</div>
          <div style={{fontSize:12,color:T.accent}}>Goal: {goalWeight} kg</div>
        </div>
      </div>
      {!onTrack&&<div style={{marginTop:10,padding:'8px 12px',background:`${T.amber}15`,borderRadius:8,fontSize:13,color:T.amber}}>
        ⚠️ Avg intake ({Math.round(avgCal)} kcal) not aligned with goal. Adjust in Settings.
      </div>}
    </Card>
  );
}

function DailyChallenges({todayMeals,water,profile,onBadge}){
  const today=new Date().toISOString().slice(0,10);
  const mealTypes=new Set(todayMeals.map(m=>m.type));
  const totalCal=todayMeals.reduce((s,m)=>s+(m.cal||0),0);
  const totalProtein=todayMeals.reduce((s,m)=>s+(m.protein||0),0);
  const workoutToday=(store.get('workout:entries')||[]).some(e=>e.at?.startsWith(today));
  const challenges=[
    {icon:'🌅',title:'Log Breakfast',done:mealTypes.has('breakfast'),desc:'Log breakfast today'},
    {icon:'💧',title:`Water (${profile.waterGoal||8} glasses)`,done:water>=(profile.waterGoal||8),desc:'Hit your water goal'},
    {icon:'💪',title:'Work Out',done:workoutToday,desc:'Log any workout'},
    {icon:'🎯',title:'Hit Calories',done:totalCal>=(profile.calGoal||2000)*0.9&&totalCal<=(profile.calGoal||2000)*1.15,desc:'Within 10% of goal'},
    {icon:'🥩',title:`Protein (${profile.proteinGoal||150}g)`,done:totalProtein>=(profile.proteinGoal||150)*0.9,desc:'Hit protein goal'},
    {icon:'🥗',title:'Log 3 Meals',done:todayMeals.length>=3,desc:'Log 3+ entries today'},
  ];
  const done=challenges.filter(c=>c.done).length;
  React.useEffect(()=>{ if(done===challenges.length)onBadge&&onBadge('all_challenges'); },[done]);
  return(
    <Card>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <SectionLabel style={{marginBottom:0}}>⚡ {L('daily_challenges')}</SectionLabel>
        <span style={{color:done===challenges.length?T.green:T.accent,fontWeight:800,fontSize:13}}>{done}/{challenges.length}</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {challenges.map((c,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 12px',background:c.done?`${T.green}15`:T.surfaceHigh,border:`1px solid ${c.done?T.green:T.border}`,borderRadius:12,transition:'all 0.3s'}}>
            <span style={{fontSize:18}}>{c.done?'✅':c.icon}</span>
            <div><div style={{fontSize:12,fontWeight:700,color:c.done?T.green:T.text}}>{c.title}</div><div style={{fontSize:10,color:T.textMuted}}>{c.desc}</div></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ShareAchievement({badge}){
  const share=()=>{
    try{
      const canvas=document.createElement('canvas');
      canvas.width=400;canvas.height=280;
      const ctx=canvas.getContext('2d');
      const g=ctx.createLinearGradient(0,0,400,280);
      g.addColorStop(0,'#080d14');g.addColorStop(1,'#1e3a5f');
      ctx.fillStyle=g;ctx.fillRect(0,0,400,280);
      ctx.font='80px serif';ctx.textAlign='center';ctx.fillText(badge.icon,200,110);
      ctx.font='bold 28px Arial';ctx.fillStyle='#3b82f6';ctx.fillText(badge.name,200,160);
      ctx.font='bold 16px Arial';ctx.fillStyle='#5d82b4';ctx.fillText('NUTRYX · Achieved!',200,200);
      ctx.font='12px Arial';ctx.fillStyle='#1e3a5f';ctx.fillText(new Date().toLocaleDateString(),200,230);
      canvas.toBlob(blob=>{
        const file=new File([blob],'nutryx-achievement.png',{type:'image/png'});
        if(navigator.share&&navigator.canShare?.({files:[file]})){navigator.share({files:[file],title:'NUTRYX Achievement'});}
        else{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='nutryx-achievement.png';a.click();URL.revokeObjectURL(url);}
      });
    }catch(e){console.warn('Share failed',e);}
  };
  return<button onClick={share} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:T.accent,padding:'4px'}} title="Share achievement">↗</button>;
}

function DataStats({meals,streaks}){
  const totalMeals=meals.length;
  const days=new Set(meals.map(m=>m.date).filter(Boolean)).size;
  const totalCal=meals.reduce((s,m)=>s+(m.cal||0),0);
  const workouts=(store.get('workout:entries')||[]).length;
  const stats=[
    {icon:'🥗',l:L('total_meals'),v:totalMeals},{icon:'📅',l:L('days_logged'),v:days},
    {icon:'🔥',l:L('kcal'),v:(totalCal/1000).toFixed(1)+'k'},{icon:'💪',l:L('total_workouts'),v:workouts},
    {icon:'💧',l:`${L('water')} 🔥`,v:streaks.water},{icon:'⚡',l:`${L('calories')} 🔥`,v:streaks.calories},
  ];
  return(
    <Card>
      <SectionLabel>📈 {L('my_stats')}</SectionLabel>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
        {stats.map(s=>(
          <div key={s.l} style={{background:T.surfaceHigh,borderRadius:12,padding:'12px 8px',textAlign:'center'}}>
            <div style={{fontSize:18}}>{s.icon}</div>
            <div style={{fontSize:16,fontWeight:800,color:T.accent,marginTop:4}}>{s.v}</div>
            <div style={{fontSize:10,color:T.textMuted,marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function HomeSection({profile,today,streaks,badges,burned=0,weeklyData=[],meals=[],onBadge}){
  const[report,setReport]=useState(null),[loadingR,setLoadingR]=useState(false);
  const[sug,setSug]=useState(null),[loadingS,setLoadingS]=useState(false);
  const[insights,setInsights]=useState(null),[loadingI,setLoadingI]=useState(false);
  const[showFasting,setShowFasting]=useState(false);
  const[showMood,setShowMood]=useState(false);

  const calGoal=profile.calGoal||2000,protGoal=profile.proteinGoal||150,waterGoal=profile.waterGoal||8;
  const netEaten=Math.max(0,today.cal-burned),calLeft=Math.max(0,calGoal-netEaten);
  const calPct=Math.min(100,Math.round((today.cal/calGoal)*100));
  const protPct=Math.min(100,Math.round((today.protein/protGoal)*100));
  const watPct=Math.min(100,Math.round((today.water/waterGoal)*100));
  const bmiVal=(profile.weight&&profile.height)?(parseFloat(profile.weight)/Math.pow(parseFloat(profile.height)/100,2)).toFixed(1):null;
  const bmiInfo=bmiVal?bmiCategory(parseFloat(bmiVal)):null;
  const hour=new Date().getHours();
  const greet=hour<12?L('good_morning'):hour<17?L('good_afternoon'):L('good_evening');

  const todayMeals=React.useMemo(()=>{const d=new Date().toISOString().slice(0,10);return meals.filter(m=>!m.date||m.date===d);},[meals]);

  const getReport=async()=>{
    setLoadingR(true);setReport(null);
    try{const t=await ai(`goal=${profile.goal},calGoal=${calGoal}. Today: cal=${today.cal},burned=${burned},protein=${today.protein}g,water=${today.water}. Return JSON:{"score":85,"scoreLabel":"...","wins":["..."],"improvements":["..."],"tomorrowPlan":"...","motivationalQuote":"..."}`,"Health coach. Return only valid JSON.");setReport(JSON.parse(t));}
    catch{setReport({score:75,scoreLabel:'Good progress!',wins:['Staying consistent'],improvements:['Drink more water'],tomorrowPlan:'Hit protein goal',motivationalQuote:'Every step counts.'});}
    setLoadingR(false);
  };

  const getSug=async()=>{
    setLoadingS(true);setSug(null);
    const prefs=profile.dietaryPrefs?.join(', ')||'none';
    try{const t=await ai(`${calLeft} kcal left, ${today.protein}g/${protGoal}g protein. Dietary: ${prefs}. Suggest 3 meals. Return JSON:{"suggestions":[{"name":"...","cal":0,"protein":0,"why":"..."},{"name":"...","cal":0,"protein":0,"why":"..."},{"name":"...","cal":0,"protein":0,"why":"..."}]}`,"Nutrition expert. Return only valid JSON.");setSug(JSON.parse(t));}
    catch{setSug({suggestions:[{name:'Greek yogurt + berries',cal:180,protein:15,why:'High protein'},{name:'Tuna wrap',cal:350,protein:30,why:'Protein boost'},{name:'Cottage cheese',cal:120,protein:14,why:'Easy snack'}]});}
    setLoadingS(false);
  };

  const getInsights=async()=>{
    setLoadingI(true);setInsights(null);
    const last7=weeklyData.slice(-7).filter(d=>d.cal>0);
    const avgCal=last7.length?Math.round(last7.reduce((s,d)=>s+d.cal,0)/last7.length):0;
    const last7meals=meals.filter(m=>{const d=new Date().toISOString().slice(0,10);const w=new Date(Date.now()-7*86400000).toISOString().slice(0,10);return m.date>=w&&m.date<=d;});
    const avgProt=last7meals.length?+(last7meals.reduce((s,m)=>s+(m.protein||0),0)/Math.max(1,last7.length)).toFixed(0):0;
    const avgSodium=last7meals.length?+(last7meals.reduce((s,m)=>s+(m.sodium||0),0)/Math.max(1,last7.length)).toFixed(0):0;
    try{
      const t=await ai(`Weekly nutrition analysis: avg ${avgCal} kcal/day (goal ${calGoal}), avg ${avgProt}g protein/day (goal ${protGoal}g), avg ${avgSodium}mg sodium/day. Days logged: ${last7.length}/7. Return JSON:{"headline":"...","patterns":["...","...","..."],"wins":["..."],"warnings":["..."],"tip":"..."}`,"Nutrition analyst. Return only valid JSON.");
      setInsights(JSON.parse(t));
    }catch{setInsights({headline:'Keep going!',patterns:['Consistent logging this week'],wins:['Above 3 days tracked'],warnings:[],tip:'Try to log every meal for better insights.'});}
    setLoadingI(false);
  };

  const BADGES=[
    {id:'first_scan',icon:'📷',name:'First Scan'},{id:'streak3',icon:'🔥',name:'On Fire'},
    {id:'streak7',icon:'⚡',name:'Week Warrior'},{id:'water_goal',icon:'💧',name:'Hydrated'},
    {id:'protein_goal',icon:'💪',name:'Protein Pro'},{id:'weight_log',icon:'⚖️',name:'Tracked'},
    {id:'workout_done',icon:'🏋️',name:'Crushed It'},{id:'meal_log5',icon:'🥗',name:'Food Diary'},
    {id:'all_challenges',icon:'🏆',name:'Champion'},
  ];

  return(
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Greeting */}
      <Card style={{background:`linear-gradient(135deg,${T.accentDim},${T.surface})`,border:`1px solid ${T.accent}33`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontWeight:800,fontSize:22,color:T.text}}>{greet}{profile.name?`, ${profile.name}`:''}! 👋</div>
            <div style={{color:T.textMuted,fontSize:13,marginTop:4}}>{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</div>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>setShowFasting(v=>!v)} title="Fasting timer" style={{background:showFasting?`${T.amber}22`:'transparent',border:`1px solid ${showFasting?T.amber:T.border}`,borderRadius:8,padding:'6px 10px',color:T.amber,cursor:'pointer',fontSize:14}}>⏱</button>
            <button onClick={()=>setShowMood(v=>!v)} title="Mood log" style={{background:showMood?`${T.purple}22`:'transparent',border:`1px solid ${showMood?T.purple:T.border}`,borderRadius:8,padding:'6px 10px',color:T.purple,cursor:'pointer',fontSize:14}}>💭</button>
          </div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:16,flexWrap:'wrap'}}>
          {[{l:L('calories'),v:today.cal,g:calGoal,u:L('kcal'),c:T.accent},{l:L('protein'),v:today.protein,g:protGoal,u:'g',c:T.cyan},{l:L('water'),v:today.water,g:waterGoal,u:L('glasses'),c:T.accent},{l:L('burned'),v:burned,g:null,u:L('kcal'),c:T.purple}].map(m=>(
            <div key={m.l} style={{flex:1,minWidth:78,background:`${m.c}15`,borderRadius:12,padding:'10px 8px'}}>
              <div style={{fontSize:17,fontWeight:800,color:m.c}}>{m.v}{m.g?<span style={{fontSize:9,color:T.textMuted}}>/{m.g}{m.u}</span>:<span style={{fontSize:9,color:T.textMuted}}> {m.u}</span>}</div>
              <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{m.l}</div>
            </div>
          ))}
        </div>
      </Card>

      {showFasting&&<FastingTimer/>}
      {showMood&&<MoodLog/>}

      {/* Rings */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {[{l:L('calories'),pct:calPct,c:T.accent},{l:L('protein'),pct:protPct,c:T.cyan},{l:L('hydration'),pct:watPct,c:T.accent}].map(m=>(
          <Card key={m.l} style={{textAlign:'center',padding:'14px 8px'}}>
            <div style={{display:'flex',justifyContent:'center'}}><Ring pct={m.pct} color={m.c} size={70}/></div>
            <div style={{marginTop:6,fontSize:16,fontWeight:800,color:T.text}}>{m.pct}%</div>
            <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{m.l}</div>
          </Card>
        ))}
      </div>

      {/* BMI + net */}
      {bmiVal&&(
        <Card style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div><div style={{fontWeight:700,color:T.textMuted,fontSize:11,letterSpacing:1}}>BMI</div><div style={{fontSize:32,fontWeight:900,color:bmiInfo.c}}>{bmiVal}</div><div style={{fontSize:13,color:bmiInfo.c,fontWeight:700}}>{bmiInfo.l}</div></div>
          <div style={{textAlign:'right'}}><div style={{fontSize:12,color:T.textMuted,marginBottom:4}}>{L('net_today')}</div><div style={{fontSize:22,fontWeight:800,color:T.accent}}>{netEaten}<span style={{fontSize:11,color:T.textMuted}}> {L('kcal')}</span></div><div style={{fontSize:12,color:T.textMuted}}>{calLeft} · {burned} {L('burned').toLowerCase()}</div></div>
        </Card>
      )}

      {/* Goal progress */}
      <GoalProgress profile={profile} weeklyData={weeklyData}/>

      {/* Calorie chart */}
      {weeklyData.some(d=>d.cal>0)&&<Card><SectionLabel>📈 CALORIE HISTORY</SectionLabel><CalorieBarChart data={weeklyData} calGoal={calGoal}/></Card>}

      {/* Weekly summary */}
      <WeeklySummary weeklyData={weeklyData} profile={profile}/>

      {/* Weekly AI insights */}
      <Card>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:insights?14:0}}>
          <div style={{fontWeight:700,color:T.cyan,fontSize:13,letterSpacing:1}}>🔬 {L('weekly_insights')}</div>
          <button onClick={getInsights} disabled={loadingI} style={{background:T.cyan,color:'#080d14',border:'none',borderRadius:8,padding:'7px 12px',fontWeight:700,fontSize:12,cursor:'pointer'}}>{loadingI?'…':'Analyze'}</button>
        </div>
        {loadingI&&<div style={{color:T.textMuted,fontSize:13,paddingTop:8}}>Analyzing your week…</div>}
        {insights&&<>
          <div style={{fontWeight:800,color:T.text,fontSize:15,marginBottom:10}}>{insights.headline}</div>
          {insights.patterns?.map((p,i)=><div key={i} style={{color:T.textMuted,fontSize:13,marginBottom:4}}>• {p}</div>)}
          {insights.wins?.length>0&&<div style={{marginTop:10,padding:'10px',background:`${T.green}10`,borderRadius:10}}>
            {insights.wins.map((w,i)=><div key={i} style={{color:T.green,fontSize:13}}>✓ {w}</div>)}
          </div>}
          {insights.warnings?.length>0&&<div style={{marginTop:8,padding:'10px',background:`${T.amber}10`,borderRadius:10}}>
            {insights.warnings.map((w,i)=><div key={i} style={{color:T.amber,fontSize:13}}>⚠ {w}</div>)}
          </div>}
          {insights.tip&&<div style={{marginTop:8,fontSize:13,color:T.cyan,fontStyle:'italic'}}>💡 {insights.tip}</div>}
        </>}
      </Card>

      {/* Daily challenges */}
      <DailyChallenges todayMeals={todayMeals} water={today.water} profile={profile} onBadge={onBadge}/>

      {/* Streaks */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:-6}}>
        <div style={{fontWeight:700,color:T.textMuted,fontSize:11,letterSpacing:1.2}}>🔥 {L('streaks')}</div>
        <Hint title="Streak Freeze" icon="🧊" color={T.cyan}>You get 1 freeze per streak per week (refreshes Monday). Use it to protect a streak when you miss a day.</Hint>
      </div>
      {(()=>{
        const freezes=store.get('streaks:freeze')||{water:0,calories:0,workout:0};
        return(
          <div style={{display:'flex',gap:10}}>
            {[{icon:'💧',l:L('water'),v:streaks.water,c:T.accent,fk:'water'},{icon:'🥗',l:L('calories'),v:streaks.calories,c:T.cyan,fk:'calories'},{icon:'💪',l:L('workout'),v:streaks.workout,c:T.purple,fk:'workout'}].map(s=>(
              <div key={s.l} style={{flex:1,background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:'12px 8px',textAlign:'center',position:'relative'}}>
                {freezes[s.fk]>0&&<span style={{position:'absolute',top:6,right:6,background:`${T.cyan}22`,color:T.cyan,borderRadius:20,padding:'1px 6px',fontSize:10,fontWeight:700}}>🧊{freezes[s.fk]}</span>}
                <div style={{fontSize:22}}>{s.icon}</div>
                <div style={{fontSize:20,fontWeight:800,color:s.c,marginTop:4}}>{s.v}<span style={{fontSize:13}}>🔥</span></div>
                <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Meal suggestions */}
      <Card>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:sug?14:0}}>
          <div style={{fontWeight:700,color:T.cyan,fontSize:13,letterSpacing:1}}>🍽️ {L('what_can_i_eat')}</div>
          <button onClick={getSug} disabled={loadingS} style={{background:T.cyan,color:'#080d14',border:'none',borderRadius:8,padding:'7px 12px',fontWeight:700,fontSize:12,cursor:'pointer'}}>{loadingS?'…':`${calLeft} kcal left`}</button>
        </div>
        {loadingS&&<div style={{color:T.textMuted,fontSize:13,paddingTop:8}}>Finding meals…</div>}
        {sug&&sug.suggestions?.map((s,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px',background:T.surfaceHigh,borderRadius:12,marginBottom:8}}>
            <div><div style={{fontWeight:700,color:T.text,fontSize:14}}>{s.name}</div><div style={{color:T.textMuted,fontSize:12,marginTop:2}}>💡 {s.why}</div></div>
            <div style={{textAlign:'right',flexShrink:0,marginLeft:10}}><div style={{color:T.accent,fontWeight:800}}>{s.cal}kcal</div><div style={{color:T.cyan,fontSize:12}}>{s.protein}g P</div></div>
          </div>
        ))}
      </Card>

      {/* AI Daily Report */}
      <Card>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:report?14:0}}>
          <div style={{fontWeight:700,color:T.accent,fontSize:13,letterSpacing:1}}>✦ {L('ai_daily_report')}</div>
          <button onClick={getReport} disabled={loadingR} style={{background:T.accent,color:'#080d14',border:'none',borderRadius:8,padding:'7px 12px',fontWeight:700,fontSize:12,cursor:'pointer'}}>{loadingR?'…':'Generate'}</button>
        </div>
        {loadingR&&<div style={{color:T.textMuted,fontSize:13,paddingTop:8}}>Analyzing…</div>}
        {report&&<>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14,padding:'14px',background:T.accentGlow,borderRadius:12}}>
            <div style={{fontSize:48,fontWeight:900,color:T.accent,lineHeight:1}}>{report.score}</div>
            <div><div style={{fontWeight:800,color:T.text,fontSize:18}}>{report.scoreLabel}</div><div style={{color:T.textMuted,fontSize:13}}>Today's score</div></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <div style={{background:`${T.green}10`,borderRadius:12,padding:'12px'}}><div style={{fontWeight:700,color:T.green,fontSize:11,marginBottom:8}}>✓ WINS</div>{report.wins?.map((w,i)=><div key={i} style={{color:T.textMuted,fontSize:13,marginBottom:4}}>• {w}</div>)}</div>
            <div style={{background:`${T.amber}10`,borderRadius:12,padding:'12px'}}><div style={{fontWeight:700,color:T.amber,fontSize:11,marginBottom:8}}>↑ IMPROVE</div>{report.improvements?.map((w,i)=><div key={i} style={{color:T.textMuted,fontSize:13,marginBottom:4}}>• {w}</div>)}</div>
          </div>
          {report.tomorrowPlan&&<div style={{padding:'12px',background:`${T.accent}10`,borderRadius:10,marginBottom:10}}><div style={{fontWeight:700,color:T.accent,fontSize:11,marginBottom:4}}>📅 TOMORROW</div><div style={{color:T.textMuted,fontSize:13}}>{report.tomorrowPlan}</div></div>}
          {report.motivationalQuote&&<div style={{fontStyle:'italic',color:T.textMuted,fontSize:13,textAlign:'center',padding:'8px 0'}}>"{report.motivationalQuote}"</div>}
        </>}
      </Card>

      {/* Data stats */}
      <DataStats meals={meals} streaks={streaks}/>

      {/* Achievements */}
      <div>
        <SectionLabel>🏆 {L('achievements')}</SectionLabel>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {BADGES.map(b=>(
            <div key={b.id} style={{background:badges[b.id]?T.surface:T.surfaceHigh,border:`1px solid ${badges[b.id]?T.accent:T.border}`,borderRadius:14,padding:'14px 8px',textAlign:'center',opacity:badges[b.id]?1:0.4,transition:'all 0.3s',position:'relative'}}>
              {badges[b.id]&&<div style={{position:'absolute',top:6,right:6}}><ShareAchievement badge={b}/></div>}
              <div style={{fontSize:26}}>{b.icon}</div>
              <div style={{fontSize:11,fontWeight:700,color:badges[b.id]?T.text:T.textMuted,marginTop:6}}>{b.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

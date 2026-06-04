import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { store } from './lib/store.js';
import { L, translateStatic, isRTL } from './lib/i18n.js';
import { T } from './lib/ui.jsx';
import db from './lib/db.js';
import { uploadBackup, fetchLatestBackup, initSupabase, getUser, onAuthStateChange } from './lib/supabase.js';

import FeatureTour from './components/FeatureTour.jsx';
import Onboarding from './components/Onboarding.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import { SharedRecipePreview } from './components/RecipeManager.jsx';
import HomeSection from './components/HomeSection.jsx';
import NutritionSection from './components/NutritionSection.jsx';
import WorkoutSection from './components/WorkoutSection.jsx';
import WaterSection from './components/WaterSection.jsx';
import WeightSection from './components/WeightSection.jsx';
import Settings from './components/Settings.jsx';
import LanguageSelector from './components/LanguageSelector.jsx';

function computeToday(meals, water){
  const t=(meals||[]).reduce((a,m)=>({
    cal:a.cal+(m.cal||0), protein:a.protein+(m.protein||0),
    carbs:a.carbs+(m.carbs||0), fat:a.fat+(m.fat||0),
    fiber:a.fiber+(m.fiber||0), sugar:a.sugar+(m.sugar||0), sodium:a.sodium+(m.sodium||0),
  }),{cal:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0,sodium:0});
  return{...t,water:water||0};
}

export default function App(){
  const[authUser,setAuthUser]=useState(null);
  const[authChecked,setAuthChecked]=useState(false);
  const[sharedRecipeId,setSharedRecipeId]=useState(()=>{
    const p=new URLSearchParams(window.location.search);
    return p.get('recipe')||null;
  });

  // Check Supabase session on startup
  useEffect(()=>{
    let unsub=()=>{};
    (async()=>{
      const s=await initSupabase();
      if(!s){ setAuthChecked(true); return; } // no supabase config → local-only mode
      const user=await getUser();
      setAuthUser(user);
      setAuthChecked(true);
      unsub=onAuthStateChange((_event,session)=>{
        setAuthUser(session?.user||null);
      });
    })();
    return()=>unsub();
  },[]);

  const hasSupabaseConfig=!!(
    (typeof import.meta!=='undefined'&&import.meta.env?.VITE_SUPABASE_URL)||
    store.get('supabase')?.url
  );

  const[profile,setProfile]=useState(store.get('profile'));

  const[meals,setMeals]=useState(()=>{
    const d=new Date().toISOString().slice(0,10);
    return(store.get('meals')||[]).map(m=>m.date?m:{...m,date:d});
  });

  const[streaks,setStreaks]=useState(store.get('streaks')||{water:0,calories:0,workout:0});
  const[badges,setBadges]=useState(store.get('badges')||{});
  const[showTour,setShowTour]=useState(!store.get('seenTour'));
  const[tab,setTab]=useState('home');

  const[water,setWater]=useState(()=>{
    const today=new Date().toISOString().slice(0,10);
    if(store.get('today:water:date')!==today){store.set('today:water',0);store.set('today:water:date',today);return 0;}
    return store.get('today:water')||0;
  });

  const[burned,setBurned]=useState(()=>{
    const today=new Date().toISOString().slice(0,10);
    return(store.get('workout:entries')||[]).filter(e=>e.at?.startsWith(today)).reduce((s,e)=>s+(e.burn||0),0);
  });

  // Restore data from Supabase when user logs in on a fresh device
  useEffect(()=>{
    if(!authUser||store.get('profile'))return;
    (async()=>{
      try{
        await db.init();
        const{data,error}=await fetchLatestBackup();
        if(error||!data?.payload)return;
        await db.importJSON(data.payload);
        const p=store.get('profile');
        if(p)setProfile(p);
        const f=await db.getMeals();
        const d=new Date().toISOString().slice(0,10);
        if(f?.length)setMeals(f.map(m=>m.date?m:{...m,date:d}));
        window.dispatchEvent(new CustomEvent('nutryx:imported'));
      }catch(e){console.warn('Supabase restore failed',e);}
    })();
  },[authUser]);

  // Initialize weekly streak freezes (1 per type on Mondays, max 2)
  useEffect(()=>{
    const today=new Date().toISOString().slice(0,10);
    if(new Date().getDay()===1){
      const last=store.get('streaks:freeze:granted')||'';
      if(last!==today){
        const cur=store.get('streaks:freeze')||{water:0,calories:0,workout:0};
        store.set('streaks:freeze',{water:Math.min(cur.water+1,2),calories:Math.min(cur.calories+1,2),workout:Math.min(cur.workout+1,2)});
        store.set('streaks:freeze:granted',today);
      }
    }
  },[]);

  // DB init + migrate all localStorage data into IndexedDB
  useEffect(()=>{
    let m=true;
    (async()=>{
      try{
        await db.init();
        await db.migrateFromLocalStorage(); // migrates meals + weights + workouts + water + moods + measurements
        const f=await db.getMeals();
        if(m&&Array.isArray(f)&&f.length){const d=new Date().toISOString().slice(0,10);setMeals(f.map(x=>x.date?x:{...x,date:d}));}
      }catch(e){console.warn('DB init',e);}
    })();
    return()=>{m=false;};
  },[]);

  useEffect(()=>{
    const fn=async()=>{try{const f=await db.getMeals();const d=new Date().toISOString().slice(0,10);setMeals((f||[]).map(x=>x.date?x:{...x,date:d}));}catch(e){}};
    window.addEventListener('nutryx:imported',fn);
    return()=>window.removeEventListener('nutryx:imported',fn);
  },[]);

  useEffect(()=>{store.set('meals',meals);(async()=>{try{await db.saveMeals(meals);}catch(e){}})();},[meals]);

  // Auto-sync — always on when signed in
  const doSync=useCallback(async()=>{
    if(!authUser)return;
    try{await uploadBackup(await db.exportJSON());}catch(e){}
  },[authUser]);

  // Sync immediately on sign-in
  useEffect(()=>{ if(authUser) doSync(); },[authUser]);

  // Sync on meals change (debounced 1s)
  useEffect(()=>{
    if(!authUser)return;
    const t=setTimeout(doSync,1000);
    return()=>clearTimeout(t);
  },[meals,authUser]);

  // Sync on any other data change (water, workouts, weights, moods)
  useEffect(()=>{
    if(!authUser)return;
    let t=null;
    const fn=()=>{ if(t)clearTimeout(t); t=setTimeout(doSync,1500); };
    window.addEventListener('nutryx:data-changed',fn);
    window.addEventListener('nutryx:workout-logged',fn);
    return()=>{ window.removeEventListener('nutryx:data-changed',fn); window.removeEventListener('nutryx:workout-logged',fn); if(t)clearTimeout(t); };
  },[authUser,doSync]);

  // Sync every 5 minutes in background
  useEffect(()=>{
    if(!authUser)return;
    const t=setInterval(doSync,5*60*1000);
    return()=>clearInterval(t);
  },[authUser,doSync]);

  useEffect(()=>{store.set('profile',profile);},[profile]);
  useEffect(()=>{store.set('streaks',streaks);},[streaks]);
  useEffect(()=>{store.set('badges',badges);},[badges]);

  // Sync water from WaterSection
  useEffect(()=>{
    const fn=()=>setWater(store.get('today:water')||0);
    window.addEventListener('nutryx:data-changed',fn);
    return()=>window.removeEventListener('nutryx:data-changed',fn);
  },[]);

  // Workout events → burned + streak
  useEffect(()=>{
    const fn=()=>{
      const today=new Date().toISOString().slice(0,10);
      const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
      const entries=store.get('workout:entries')||[];
      setBurned(entries.filter(e=>e.at?.startsWith(today)).reduce((s,e)=>s+(e.burn||0),0));
      setStreaks(prev=>{
        const last=store.get('streaks:workout:date')||'';
        if(last===today)return prev;
        // Check freeze
        const freeze=store.get('streaks:freeze')||{};
        const daysSinceLast=last?(today>last?1:0):999;
        if(daysSinceLast>1&&freeze.workout>0){store.set('streaks:freeze',{...freeze,workout:freeze.workout-1});return prev;}
        const next={...prev,workout:last===yesterday?(prev.workout||0)+1:1};
        store.set('streaks:workout:date',today);return next;
      });
    };
    window.addEventListener('nutryx:workout-logged',fn);
    return()=>window.removeEventListener('nutryx:workout-logged',fn);
  },[]);

  // Cal + water streaks
  useEffect(()=>{
    if(!profile)return;
    const today=new Date().toISOString().slice(0,10);
    const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    const todayCal=meals.filter(m=>m.date===today).reduce((s,m)=>s+(m.cal||0),0);
    setStreaks(prev=>{
      let changed=false;const next={...prev};
      const freeze=store.get('streaks:freeze')||{};
      [['calories',todayCal>=(profile.calGoal||2000)*0.9,'streaks:cal:date'],
       ['water',water>=(profile.waterGoal||8),'streaks:water:date']
      ].forEach(([key,hit,dateKey])=>{
        if(hit){
          const last=store.get(dateKey)||'';
          if(last!==today){next[key]=last===yesterday?(prev[key]||0)+1:1;store.set(dateKey,today);changed=true;}
        }
      });
      return changed?next:prev;
    });
  },[meals,water,profile]);

  // Profile migration
  useEffect(()=>{
    if(!profile)return;
    const hasSex=!!profile.sex,calNum=Number(profile.calGoal);
    if(!hasSex||!isFinite(calNum)||calNum>6000||calNum<800){
      const w=parseFloat(profile.weight)||75,h=parseFloat(profile.height)||170,a=parseFloat(profile.age)||25;
      const sex=profile.sex||'male';
      const bmr=Math.round(10*w+6.25*h-5*a+(sex==='male'?5:-161));
      const mult={sedentary:1.2,light:1.375,moderate:1.55,active:1.725}[profile.activity]||1.55;
      const tdee=Math.round(bmr*mult);
      const cal=profile.goal==='lose'?tdee-400:profile.goal==='gain'?tdee+300:tdee;
      const migrated={...profile,sex,calGoal:cal,proteinGoal:Math.round(w*(profile.goal==='gain'?2:1.6))};
      setProfile(migrated);store.set('profile',migrated);
    }
  },[profile]);

  // Notification scheduler
  useEffect(()=>{
    const wm=store.get('notif:waterMins');
    if(!wm||typeof Notification==='undefined'||Notification.permission!=='granted')return;
    const t=setInterval(()=>{try{new Notification('💧 NUTRYX',{body:'Time to drink water!',icon:'/icons/icon-192.svg'});}catch(e){}},wm*60000);
    return()=>clearInterval(t);
  },[]);

  useEffect(()=>{
    const mt=store.get('notif:mealTimes')||[];
    if(!mt.length||typeof Notification==='undefined'||Notification.permission!=='granted')return;
    let last={};
    const t=setInterval(()=>{
      const now=new Date();
      const hm=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      if(mt.includes(hm)&&!last[hm]){last={[hm]:true};try{new Notification('🍽️ NUTRYX',{body:'Time to log your meal!',icon:'/icons/icon-192.svg'});}catch(e){}}
    },30000);
    return()=>clearInterval(t);
  },[]);

  const todayMeals=useMemo(()=>{const d=new Date().toISOString().slice(0,10);return meals.filter(m=>!m.date||m.date===d);},[meals]);
  const today=useMemo(()=>computeToday(todayMeals,water),[todayMeals,water]);

  const weeklyData=useMemo(()=>{
    const r=[];
    for(let i=13;i>=0;i--){
      const d=new Date(Date.now()-i*86400000).toISOString().slice(0,10);
      const dm=meals.filter(m=>m.date===d);
      r.push({date:d,cal:dm.reduce((s,m)=>s+(m.cal||0),0),label:new Date(d+'T12:00:00').toLocaleDateString('en',{weekday:'short'})});
    }
    return r;
  },[meals]);

  const handleAdd=(m)=>{const date=new Date().toISOString().slice(0,10);const id=Date.now();setMeals(prev=>[...prev,{...m,date,id}]);};
  const handleEdit=(updated)=>setMeals(prev=>prev.map(m=>m.id===updated.id?updated:m));
  const handleDelete=(id)=>setMeals(prev=>prev.filter(m=>m.id!==id));
  const handleBadge=(id)=>{setBadges(prev=>{const n={...prev,[id]:true};store.set('badges',n);return n;});};

  // Auth gate: show loading spinner, then AuthScreen if not signed in
  if(!authChecked)return(
    <div style={{minHeight:'100dvh',background:T.bg,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
      <div style={{fontSize:36}}>🥗</div>
      <div style={{fontWeight:900,color:T.accent,fontSize:22}}>NUTRYX</div>
      <div style={{color:T.textMuted,fontSize:13}}>Loading…</div>
    </div>
  );
  if(hasSupabaseConfig&&!authUser)return<AuthScreen onAuth={setAuthUser}/>;

  if(!profile)return<Onboarding onDone={(p)=>{setProfile(p);store.set('profile',p);setTab('home');}}/>;

  return(
    <div id="app-shell" dir={isRTL()?'rtl':'ltr'} style={{background:T.bg,minHeight:'100dvh',display:'flex',flexDirection:'column'}}>
      {sharedRecipeId&&<SharedRecipePreview recipeId={sharedRecipeId} onClose={()=>{setSharedRecipeId(null);window.history.replaceState({},'',window.location.pathname);}}/>}
      {showTour&&<FeatureTour onDone={()=>{setShowTour(false);store.set('seenTour',true);}}/>}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:`calc(12px + env(safe-area-inset-top)) 16px 12px`,background:T.surface,borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontWeight:900,color:T.accent,fontSize:18}}>NUTRYX</div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <LanguageSelector/>
          <button onClick={()=>setTab('settings')} style={{background:'transparent',border:'none',color:T.textMuted,fontSize:18,cursor:'pointer'}}>⚙️</button>
        </div>
      </div>
      <div id="scroll-area" style={{padding:16,flex:1,overflowY:'auto'}}>
        {tab==='home'    &&<HomeSection profile={profile} today={today} streaks={streaks} badges={badges} burned={burned} weeklyData={weeklyData} meals={meals} onBadge={handleBadge}/>}
        {tab==='food'    &&<NutritionSection meals={todayMeals} allMeals={meals} onAdd={handleAdd} onEdit={handleEdit} onDelete={handleDelete} profile={profile} onBadge={handleBadge}/>}
        {tab==='workout' &&<WorkoutSection profile={profile}/>}
        {tab==='water'   &&<WaterSection/>}
        {tab==='weight'  &&<WeightSection/>}
        {tab==='settings'&&<Settings profile={profile} onProfileChange={(p)=>{setProfile(p);store.set('profile',p);}} authUser={authUser} onSignOut={()=>setAuthUser(null)}/>}
      </div>
      <div style={{background:T.surface,borderTop:`1px solid ${T.border}`}}>
        <div style={{display:'flex',justifyContent:'space-around'}}>
          {[['home','🏠'],['food','🥗'],['workout','💪'],['water','💧'],['weight','⚖️']].map(([id,icon])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{background:'none',border:'none',cursor:'pointer',padding:'6px 10px 4px',
                display:'flex',flexDirection:'column',alignItems:'center',gap:2,flex:1,
                color:tab===id?T.accent:T.textMuted}}>
              <span style={{fontSize:24,lineHeight:1}}>{icon}</span>
              <span style={{fontSize:11,fontWeight:tab===id?700:500}}>{L(id)}</span>
              {tab===id&&<span style={{width:18,height:3,background:T.accent,borderRadius:2}}/>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

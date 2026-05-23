import React, { useState, useEffect, useMemo } from 'react';
import { store } from './lib/store.js';
import { L, translateStatic } from './lib/i18n.js';
import { T } from './lib/ui.jsx';
import db from './lib/db.js';
import { uploadBackup } from './lib/supabase.js';

import FeatureTour from './components/FeatureTour.jsx';
import Onboarding from './components/Onboarding.jsx';
import HomeSection from './components/HomeSection.jsx';
import NutritionSection from './components/NutritionSection.jsx';
import WorkoutSection from './components/WorkoutSection.jsx';
import WaterSection from './components/WaterSection.jsx';
import WeightSection from './components/WeightSection.jsx';
import Settings from './components/Settings.jsx';
import LanguageSelector from './components/LanguageSelector.jsx';

function computeTodayFromMeals(meals){
  const totals = (meals||[]).reduce((a,m)=>({
    cal:(a.cal||0)+(m.cal||0),
    protein:(a.protein||0)+(m.protein||0),
    carbs:(a.carbs||0)+(m.carbs||0),
    fat:(a.fat||0)+(m.fat||0)
  }),{cal:0,protein:0,carbs:0,fat:0});
  return { cal: totals.cal||0, protein: totals.protein||0, water: store.get('today:water') || 0 };
}

export default function App(){
  const [profile,setProfile] = useState(store.get('profile'));
  const [meals,setMeals] = useState(store.get('meals')||[]);
  const [streaks,setStreaks] = useState(store.get('streaks')||{water:0,calories:0,workout:0});
  const [badges,setBadges] = useState(store.get('badges')||{});
  const [showTour,setShowTour] = useState(!store.get('seenTour'));
  const [tab,setTab] = useState('home');

  // initialize DB and migrate meals from localStorage if needed
  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      try{
        await db.init();
        await db.migrateFromLocalStorage();
        const fromDb = await db.getMeals();
        if (mounted && Array.isArray(fromDb) && fromDb.length){
          setMeals(fromDb);
        }
      }catch(e){ console.warn('DB init/migrate error', e); }
    })();
    return ()=>{ mounted = false; };
  },[]);

  // listen for imports/remote sync events to refresh meals
  useEffect(()=>{
    const onImported = async ()=>{
      try{ const fresh = await db.getMeals(); setMeals(fresh||[]); }catch(e){}
    };
    window.addEventListener('nutryx:imported', onImported);
    return ()=>{ window.removeEventListener('nutryx:imported', onImported); };
  },[]);

  useEffect(()=>{
    store.set('meals',meals);
    (async ()=>{ try{ await db.saveMeals(meals); }catch(e){} })();
  },[meals]);

  // Auto-sync to cloud when meals change (debounced)
  useEffect(()=>{
    const enabled = store.get('supabase:autoSync');
    if (!enabled) return;
    let t = setTimeout(async ()=>{
      try{
        const payload = await db.exportJSON();
        await uploadBackup(payload);
        console.log('Auto-sync complete');
      }catch(e){ console.warn('Auto-sync failed', e); }
    }, 1000);
    return ()=>{ clearTimeout(t); };
  },[meals]);
  useEffect(()=>{ store.set('profile',profile); },[profile]);
  useEffect(()=>{ store.set('streaks',streaks); },[streaks]);
  useEffect(()=>{ store.set('badges',badges); },[badges]);

  // Migration: if a stored profile is missing `sex` or has an outlier `calGoal`, recalc it
  useEffect(()=>{
    if(!profile) return;
    const hasSex = !!profile.sex;
    const calNum = Number(profile.calGoal);
    const calOutlier = !isFinite(calNum) || calNum > 4000 || calNum < 800;
    if(!hasSex || calOutlier){
      const w = parseFloat(profile.weight)||75;
      const h = parseFloat(profile.height)||170;
      const a = parseFloat(profile.age)||25;
      const sex = profile.sex||'male';
      const bmr = Math.round(10*w + 6.25*h - 5*a + (sex === 'male' ? 5 : -161));
      const mult = {sedentary:1.2,light:1.375,moderate:1.55,active:1.725}[profile.activity]||1.55;
      const tdee = Math.round(bmr * mult);
      const cal = profile.goal==="lose"?tdee-400:profile.goal==="gain"?tdee+300:tdee;
      const proteinGoal = Math.round(w*(profile.goal==="gain"?2:1.6));
      const migrated = {...profile, sex, calGoal:cal, proteinGoal};
      setProfile(migrated);
      store.set('profile',migrated);
    }
  },[profile]);

  const today = useMemo(()=>computeTodayFromMeals(meals),[meals]);

  const handleAdd = (m)=>{ setMeals(prev=>{ const next=[...prev,m]; store.set('meals',next); return next; }); };
  const handleBadge = (id)=>{ setBadges(prev=>{ const n={...prev,[id]:true}; store.set('badges',n); return n; }); };

  if(!profile) return <Onboarding onDone={(p)=>{ setProfile(p); store.set('profile',p); setTab('home'); }} />;

  return (
    <div id="app-shell">
      {showTour && <FeatureTour onDone={()=>{ setShowTour(false); store.set('seenTour',true); }} />}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px'}}>
        <div style={{fontWeight:900,color:T.accent,fontSize:18}}>NUTRYX</div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <LanguageSelector />
          <button onClick={()=>setTab('settings')} style={{background:'transparent',border:'none',color:T.textMuted,fontSize:18,cursor:'pointer'}}>⚙️</button>
        </div>
      </div>
      <div id="scroll-area" style={{padding:16}}>
        {tab==='home' && <HomeSection profile={profile} today={today} streaks={streaks} badges={badges} />}
        {tab==='food' && <NutritionSection meals={meals} onAdd={handleAdd} profile={profile} onBadge={handleBadge} />}
        {tab==='workout' && <WorkoutSection />}
        {tab==='water' && <WaterSection />}
        {tab==='weight' && <WeightSection />}
        {tab==='settings' && <Settings />}
      </div>
      <div id="bottom-nav" style={{background:T.surface,borderTop:`1px solid ${T.border}`,padding:'8px 0'}}>
        <div style={{display:'flex',justifyContent:'space-around'}}>
          <button onClick={()=>setTab('home')} style={{background:'none',border:'none',color:tab==='home'?T.accent:T.textMuted}}>🏠<div style={{fontSize:10}}>Home</div></button>
          <button onClick={()=>setTab('food')} style={{background:'none',border:'none',color:tab==='food'?T.accent:T.textMuted}}>🥗<div style={{fontSize:10}}>Food</div></button>
          <button onClick={()=>setTab('workout')} style={{background:'none',border:'none',color:tab==='workout'?T.accent:T.textMuted}}>💪<div style={{fontSize:10}}>Workout</div></button>
          <button onClick={()=>setTab('water')} style={{background:'none',border:'none',color:tab==='water'?T.accent:T.textMuted}}>💧<div style={{fontSize:10}}>Water</div></button>
          <button onClick={()=>setTab('weight')} style={{background:'none',border:'none',color:tab==='weight'?T.accent:T.textMuted}}>⚖️<div style={{fontSize:10}}>Weight</div></button>
        </div>
      </div>
    </div>
  );
}

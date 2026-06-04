import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input, Card, Btn, OutlineBtn, SectionLabel, Tag, T } from '../lib/ui.jsx';
import { CATS } from '../lib/constants.js';
import { store } from '../lib/store.js';
import { searchUSDA, searchOFF } from '../lib/api.js';

export default function FoodSearch({onAdd,profile}){
  const[query,setQuery]=useState('');
  const[results,setResults]=useState([]);
  const[busy,setBusy]=useState(false);
  const[selected,setSelected]=useState(null);
  const[servings,setServings]=useState(1);
  const[grams,setGrams]=useState('');
  const[cat,setCat]=useState(null);
  const[recent,setRecent]=useState([]);
  const[favorites,setFavorites]=useState(()=>store.get('favorites')||[]);
  const debRef=useRef(null);

  useEffect(()=>{ setRecent(store.get('recent-foods')||[]); },[]);

  const toggleFav=(f,e)=>{
    e.stopPropagation();
    const key=f.name+(f.brand||'');
    const exists=favorites.some(x=>(x.name+(x.brand||''))===key);
    const next=exists?favorites.filter(x=>(x.name+(x.brand||''))!==key):[f,...favorites].slice(0,30);
    setFavorites(next); store.set('favorites',next);
  };
  const isFav=(f)=>favorites.some(x=>(x.name+(x.brand||')'))===f.name+(f.brand||''));

  const search=useCallback(async(q)=>{
    if(!q.trim()){setResults([]);return;}
    setBusy(true);
    try{
      const cached=store.get(`search:${q.toLowerCase()}`);
      if(cached&&Array.isArray(cached.data)&&cached.data.length>0&&(Date.now()-cached.ts)<3600000){
        setResults(cached.data);setBusy(false);return;
      }
      const[u,o]=await Promise.all([searchUSDA(q),searchOFF(q)]);
      const merged=[...u,...o].filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i);
      store.set(`search:${q.toLowerCase()}`,{data:merged,ts:Date.now()});
      setResults(merged);
    }catch(err){ setResults([]); }
    setBusy(false);
  },[]);

  useEffect(()=>{
    clearTimeout(debRef.current);
    if(!query.trim()){setResults([]);return;}
    debRef.current=setTimeout(()=>search(query),400);
    return()=>clearTimeout(debRef.current);
  },[query,search]);

  const loadCat=async(c)=>{ setCat(c.id); setQuery(c.q); await search(c.q); };
  const selectFood=(f)=>{ setSelected(f); setServings(1); };

  const parseServingGrams=(s)=>{
    if(!s)return null;
    const m1=String(s).match(/(\d+(?:\.\d+)?)\s*(g|gram|grams)\b/i);if(m1)return parseFloat(m1[1]);
    const m2=String(s).match(/\((\d+(?:\.\d+)?)\s*(g|gram|grams)\)/i);if(m2)return parseFloat(m2[1]);
    const m3=String(s).match(/^(\d+(?:\.\d+)?)$/);if(m3)return parseFloat(m3[1]);
    return null;
  };

  const p=selected?.perServing||{};
  const servingGrams=parseServingGrams(selected?.serving);
  const gramsValForDisplay=parseFloat(grams);
  const displayMultiplier=(!isNaN(gramsValForDisplay)&&gramsValForDisplay>0)?(servingGrams?gramsValForDisplay/servingGrams:gramsValForDisplay/100):(servings||1);

  useEffect(()=>{
    if(selected&&(!grams||grams==='')&&servingGrams) setGrams(String(servingGrams*(servings||1)));
  },[servingGrams,selected]);

  const addFood=()=>{
    if(!selected)return;
    const multiplier=displayMultiplier;
    const item={
      name:`${selected.name}${selected.brand?` (${selected.brand})`:''}`,
      cal:Math.round((p.cal||0)*multiplier),
      protein:+((p.protein||0)*multiplier).toFixed(1),
      carbs:+((p.carbs||0)*multiplier).toFixed(1),
      fat:+((p.fat||0)*multiplier).toFixed(1),
      fiber:+((p.fiber||0)*multiplier).toFixed(1),
      sugar:+((p.sugar||0)*multiplier).toFixed(1),
      sodium:+((p.sodium||0)*multiplier).toFixed(0),
    };
    onAdd(item);
    const rf=[selected,...(recent||[]).filter(f=>f.name!==selected.name)].slice(0,10);
    setRecent(rf);store.set('recent-foods',rf);
    store.set(`food:n:${selected.name.toLowerCase().replace(/\s+/g,'-')}`,{...selected,savedAt:Date.now()});
    setSelected(null);setGrams('');
  };

  const srcColor={usda:T.green,openfoodfacts:T.accent,ai:T.amber,'local-db':T.purple};
  const srcLabel={usda:'USDA',openfoodfacts:'Branded',ai:'AI','local-db':'Saved'};
  const nc={A:'#037d3a',B:'#85bb2f',C:'#fecb02',D:'#ee8100',E:'#e63e11'};

  const FoodRow=({f,onClick})=>(
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px',background:T.surfaceHigh,borderRadius:12,cursor:'pointer',marginBottom:8,border:`1px solid transparent`}}>
      <div onClick={onClick} style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,color:T.text,fontSize:15,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</div>
        <div style={{display:'flex',gap:6,marginTop:4,alignItems:'center'}}>
          <span style={{fontSize:11,color:srcColor[f.source]||T.textMuted,fontWeight:700}}>{srcLabel[f.source]}</span>
          {f.brand&&<span style={{fontSize:12,color:T.textMuted}}>· {f.brand}</span>}
          {f.nutriscore&&<span style={{background:nc[f.nutriscore]||'#555',color:'#fff',borderRadius:4,padding:'1px 5px',fontSize:10,fontWeight:700}}>NS-{f.nutriscore}</span>}
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0,marginLeft:12}}>
        <div style={{textAlign:'right'}} onClick={onClick}>
          <div style={{color:T.accent,fontWeight:800,fontSize:15}}>{f.perServing?.cal}<span style={{fontSize:10,color:T.textMuted}}>kcal</span></div>
          <div style={{fontSize:12,color:T.textMuted}}>{f.perServing?.protein}g P</div>
        </div>
        <button onClick={(e)=>toggleFav(f,e)}
          style={{background:'none',border:'none',cursor:'pointer',fontSize:18,padding:'2px',color:isFav(f)?T.amber:T.textMuted}}>
          {isFav(f)?'★':'☆'}
        </button>
      </div>
    </div>
  );

  return(
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{position:'relative'}}>
        <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',fontSize:18,color:T.textMuted,pointerEvents:'none'}}>🔍</span>
        <input value={query} onChange={e=>{setQuery(e.target.value);setSelected(null);}} placeholder="Search 300,000+ foods…"
          style={{width:'100%',background:T.surfaceHigh,border:`1px solid ${T.border}`,borderRadius:14,padding:'14px 44px',color:T.text,fontSize:16,outline:'none'}}/>
        {query&&<button onClick={()=>{setQuery('');setResults([]);setSelected(null);}} style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:T.textMuted,cursor:'pointer',fontSize:20}}>✕</button>}
      </div>

      <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:4}}>
        {CATS.map(c=><button key={c.id} onClick={()=>loadCat(c)}
          style={{background:cat===c.id?T.accentDim:'transparent',color:cat===c.id?T.accent:T.textMuted,border:`1px solid ${cat===c.id?T.accent:T.border}`,borderRadius:20,padding:'8px 16px',fontSize:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
          {c.l}</button>)}
      </div>

      {selected&&<div style={{background:T.accentGlow,border:`1px solid ${T.accentDim}`,borderRadius:14,padding:'16px'}}>
        <div style={{fontWeight:800,color:T.text,fontSize:16,marginBottom:4}}>{selected.name}</div>
        {selected.brand&&<div style={{color:T.textMuted,fontSize:13,marginBottom:10}}>{selected.brand}</div>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
          {[{l:'Cal',v:p.cal,u:'kcal',c:T.accent},{l:'Protein',v:p.protein,u:'g',c:T.cyan},{l:'Carbs',v:p.carbs,u:'g',c:T.amber},{l:'Fat',v:p.fat,u:'g',c:T.red},{l:'Fiber',v:p.fiber||0,u:'g',c:T.purple},{l:'Sodium',v:p.sodium||0,u:'mg',c:T.orange}].map(m=>(
            <div key={m.l} style={{background:T.surfaceHigh,borderRadius:10,padding:'10px 8px',textAlign:'center'}}>
              <div style={{fontSize:15,fontWeight:800,color:m.c}}>{+(m.v*displayMultiplier).toFixed(1)}<span style={{fontSize:10,color:T.textMuted}}>{m.u}</span></div>
              <div style={{fontSize:11,color:T.textMuted}}>{m.l}</div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
          <span style={{color:T.textMuted,fontSize:14,fontWeight:600}}>Servings:</span>
          <div style={{display:'flex',alignItems:'center',gap:10,background:T.surfaceHigh,borderRadius:12,padding:'6px 14px'}}>
            <button onClick={()=>setServings(s=>Math.max(0.25,+(s-0.25).toFixed(2)))} style={{background:'none',border:'none',color:T.accent,fontSize:24,cursor:'pointer',fontWeight:700}}>−</button>
            <span style={{color:T.text,fontWeight:800,fontSize:20,minWidth:36,textAlign:'center'}}>{servings}</span>
            <button onClick={()=>setServings(s=>+(s+0.25).toFixed(2))} style={{background:'none',border:'none',color:T.accent,fontSize:24,cursor:'pointer',fontWeight:700}}>+</button>
          </div>
          <span style={{color:T.textMuted,fontSize:13}}>{Math.round(p.cal*displayMultiplier)} kcal</span>
        </div>
        <div style={{display:'flex',gap:10}}>
          <Btn onClick={addFood} style={{flex:1}}>✓ Add to Log</Btn>
          <OutlineBtn onClick={()=>setSelected(null)}>✕</OutlineBtn>
        </div>
      </div>}

      {busy&&!selected&&<div style={{textAlign:'center',padding:'24px 0',color:T.textMuted}}><div style={{fontSize:32,animation:'spin 1s linear infinite',display:'inline-block'}}>🔍</div><div style={{fontSize:14,marginTop:8}}>Searching…</div></div>}

      {/* Favorites */}
      {!query&&!busy&&favorites.length>0&&!selected&&<div>
        <SectionLabel>★ FAVORITES</SectionLabel>
        {favorites.slice(0,5).map((f,i)=><FoodRow key={i} f={f} onClick={()=>selectFood(f)}/>)}
      </div>}

      {/* Recent */}
      {!query&&!busy&&recent.length>0&&!selected&&<div>
        <SectionLabel>🕐 RECENTLY LOGGED</SectionLabel>
        {recent.slice(0,5).map((f,i)=><FoodRow key={i} f={f} onClick={()=>selectFood(f)}/>)}
      </div>}

      {results.length>0&&!selected&&<div>
        <SectionLabel>{results.length} RESULTS</SectionLabel>
        {results.map((f,i)=><FoodRow key={i} f={f} onClick={()=>selectFood(f)}/>)}
      </div>}

      {!busy&&query&&results.length===0&&!selected&&<div style={{textAlign:'center',padding:'30px 0',color:T.textMuted}}>
        <div style={{fontSize:36,marginBottom:10}}>🔍</div><div style={{fontSize:14}}>No results for "<b style={{color:T.text}}>{query}</b>"</div>
      </div>}

      {!query&&!busy&&<div style={{padding:'14px',background:T.accentGlow,borderRadius:12,border:`1px solid ${T.accentDim}`,fontSize:13,color:T.textMuted,display:'flex',gap:10,alignItems:'flex-start'}}>
        <span style={{fontSize:18,flexShrink:0}}>ℹ️</span>
        <span><b style={{color:T.text}}>300,000+</b> USDA foods · <b style={{color:T.text}}>3M+</b> branded products · Star to favorite</span>
      </div>}
    </div>
  );
}

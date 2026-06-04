import React, { useState } from 'react';
import { Card, SectionLabel, T, Input, Btn, OutlineBtn, Tag } from '../lib/ui.jsx';
import { searchUSDA, searchOFF } from '../lib/api.js';
import { store } from '../lib/store.js';

export default function RecipeBuilder({ onAdd }) {
  const [name, setName]         = useState('');
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [busy, setBusy]         = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [servings, setServings] = useState(1);

  const search = async () => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const [u, o] = await Promise.all([searchUSDA(query), searchOFF(query)]);
      setResults([...u, ...o].slice(0, 8));
    } catch(e) { setResults([]); }
    setBusy(false);
  };

  const addIngredient = (food, grams=100) => {
    const ratio = grams / 100;
    const p = food.perServing || {};
    const servingGrams = parseFloat(String(food.serving||'100').match(/(\d+)/)?.[1]) || 100;
    const mult = grams / servingGrams;
    setIngredients(prev => [...prev, {
      name: food.name, grams,
      cal:     Math.round((p.cal||0)*mult),
      protein: +((p.protein||0)*mult).toFixed(1),
      carbs:   +((p.carbs||0)*mult).toFixed(1),
      fat:     +((p.fat||0)*mult).toFixed(1),
      fiber:   +((p.fiber||0)*mult).toFixed(1),
    }]);
    setQuery(''); setResults([]);
  };

  const remove = (i) => setIngredients(prev => prev.filter((_,idx)=>idx!==i));

  const totals = ingredients.reduce((a,i)=>({
    cal:     a.cal+(i.cal||0),
    protein: a.protein+(i.protein||0),
    carbs:   a.carbs+(i.carbs||0),
    fat:     a.fat+(i.fat||0),
    fiber:   a.fiber+(i.fiber||0),
  }),{cal:0,protein:0,carbs:0,fat:0,fiber:0});

  const perServing = {
    cal:     Math.round(totals.cal/servings),
    protein: +(totals.protein/servings).toFixed(1),
    carbs:   +(totals.carbs/servings).toFixed(1),
    fat:     +(totals.fat/servings).toFixed(1),
  };

  const logRecipe = () => {
    if (!name.trim() || ingredients.length === 0) return;
    onAdd({ name: name.trim(), ...perServing });
    // Save recipe to store for reuse
    const saved = store.get('recipes') || [];
    store.set('recipes', [{name:name.trim(), ingredients, servings, ...perServing, savedAt:Date.now()}, ...saved].slice(0,20));
    setName(''); setIngredients([]); setServings(1); setQuery('');
  };

  const [gramInput, setGramInput] = useState({});

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <Card>
        <SectionLabel>🍳 RECIPE BUILDER</SectionLabel>
        <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Recipe name (e.g. Chicken Bowl)"/>
      </Card>

      {/* Search ingredients */}
      <Card>
        <SectionLabel>ADD INGREDIENTS</SectionLabel>
        <div style={{display:'flex',gap:8,marginBottom:10}}>
          <Input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Search ingredient…" style={{flex:1}}/>
          <Btn onClick={search} disabled={busy} style={{flexShrink:0}}>{busy?'…':'Search'}</Btn>
        </div>
        {results.map((f,i)=>{
          const g = gramInput[i] || '100';
          return (
            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'10px',background:T.surfaceHigh,borderRadius:10,marginBottom:8}}>
              <div style={{flex:1,fontSize:13,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.name}</div>
              <input type="number" value={g} onChange={e=>setGramInput(prev=>({...prev,[i]:e.target.value}))}
                placeholder="g" style={{width:60,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:'6px 8px',color:T.text,fontSize:13}}/>
              <span style={{fontSize:12,color:T.textMuted}}>g</span>
              <Btn onClick={()=>addIngredient(f,parseFloat(g)||100)} small>Add</Btn>
            </div>
          );
        })}
      </Card>

      {/* Ingredients list */}
      {ingredients.length > 0 && (
        <Card>
          <SectionLabel>INGREDIENTS ({ingredients.length})</SectionLabel>
          {ingredients.map((ing,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${T.border}`}}>
              <div>
                <div style={{color:T.text,fontSize:14,fontWeight:600}}>{ing.name}</div>
                <div style={{color:T.textMuted,fontSize:12}}>{ing.grams}g · {ing.cal}kcal · {ing.protein}g P</div>
              </div>
              <OutlineBtn onClick={()=>remove(i)} color={T.red} small>✕</OutlineBtn>
            </div>
          ))}

          <div style={{marginTop:14,padding:'12px',background:T.accentGlow,borderRadius:10}}>
            <div style={{fontWeight:700,color:T.textMuted,fontSize:11,marginBottom:8}}>TOTAL · {totals.cal} kcal</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <Tag color={T.accent}>{totals.cal}kcal</Tag>
              <Tag color={T.cyan}>{totals.protein}g P</Tag>
              <Tag color={T.amber}>{totals.carbs}g C</Tag>
              <Tag color={T.red}>{totals.fat}g F</Tag>
            </div>
          </div>

          <div style={{marginTop:12,display:'flex',alignItems:'center',gap:10}}>
            <span style={{color:T.textMuted,fontSize:14}}>Servings:</span>
            <button onClick={()=>setServings(s=>Math.max(1,s-1))} style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,width:30,height:30,cursor:'pointer',fontWeight:700}}>−</button>
            <span style={{color:T.accent,fontWeight:800,fontSize:18,minWidth:24,textAlign:'center'}}>{servings}</span>
            <button onClick={()=>setServings(s=>s+1)} style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,width:30,height:30,cursor:'pointer',fontWeight:700}}>+</button>
            <span style={{color:T.textMuted,fontSize:13}}>→ {perServing.cal} kcal/serving</span>
          </div>

          <Btn onClick={logRecipe} disabled={!name.trim()} style={{width:'100%',marginTop:12}}>
            Log as Meal ({perServing.cal} kcal)
          </Btn>
        </Card>
      )}

      {/* Saved recipes */}
      {(store.get('recipes')||[]).length > 0 && (
        <Card>
          <SectionLabel>📖 SAVED RECIPES</SectionLabel>
          {(store.get('recipes')||[]).slice(0,5).map((r,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:`1px solid ${T.border}`}}>
              <div>
                <div style={{color:T.text,fontWeight:600}}>{r.name}</div>
                <div style={{color:T.textMuted,fontSize:12}}>{r.cal}kcal · {r.protein}g P · {r.ingredients?.length||0} ingredients</div>
              </div>
              <Btn onClick={()=>onAdd({name:r.name,cal:r.cal,protein:r.protein,carbs:r.carbs,fat:r.fat})} small>Log</Btn>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

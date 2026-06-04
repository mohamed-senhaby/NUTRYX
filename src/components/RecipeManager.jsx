import React, { useState, useEffect, useRef } from 'react';
import { Card, SectionLabel, T, Input, Btn, OutlineBtn, Tag } from '../lib/ui.jsx';
import { searchUSDA, searchOFF, lookupBarcode } from '../lib/api.js';
import { store } from '../lib/store.js';
import { saveRecipe, deleteSharedRecipe } from '../lib/supabase.js';
import BarcodeScanner from './BarcodeScanner.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toPer100g(food) {
  const p = food.perServing || food.per100g || {};
  const match = String(food.serving || '100').match(/([\d.]+)\s*g/i);
  const servingG = match ? parseFloat(match[1]) : 100;
  const r = 100 / servingG;
  return {
    cal:     Math.round((p.cal     || 0) * r),
    protein: +((p.protein || 0) * r).toFixed(1),
    carbs:   +((p.carbs   || 0) * r).toFixed(1),
    fat:     +((p.fat     || 0) * r).toFixed(1),
    fiber:   +((p.fiber   || 0) * r).toFixed(1),
  };
}

function calcFromGrams(per100g, grams) {
  const g = parseFloat(grams) || 0;
  return {
    cal:     Math.round((per100g.cal     || 0) * g / 100),
    protein: +((per100g.protein || 0) * g / 100).toFixed(1),
    carbs:   +((per100g.carbs   || 0) * g / 100).toFixed(1),
    fat:     +((per100g.fat     || 0) * g / 100).toFixed(1),
    fiber:   +((per100g.fiber   || 0) * g / 100).toFixed(1),
  };
}

function calcRecipePer100g(ingredients) {
  const totalWeight = ingredients.reduce((s, i) => s + (i.grams || 0), 0);
  if (!totalWeight) return { per100g: { cal:0,protein:0,carbs:0,fat:0,fiber:0 }, totalWeight: 0, totalNutrition: { cal:0,protein:0,carbs:0,fat:0,fiber:0 } };
  const totalNutrition = ingredients.reduce((a, i) => {
    const c = calcFromGrams(i.per100g, i.grams);
    return { cal: a.cal+c.cal, protein: a.protein+c.protein, carbs: a.carbs+c.carbs, fat: a.fat+c.fat, fiber: a.fiber+c.fiber };
  }, { cal:0, protein:0, carbs:0, fat:0, fiber:0 });
  const per100g = {
    cal:     Math.round(totalNutrition.cal     / totalWeight * 100),
    protein: +((totalNutrition.protein / totalWeight * 100).toFixed(1)),
    carbs:   +((totalNutrition.carbs   / totalWeight * 100).toFixed(1)),
    fat:     +((totalNutrition.fat     / totalWeight * 100).toFixed(1)),
    fiber:   +((totalNutrition.fiber   / totalWeight * 100).toFixed(1)),
  };
  return { per100g, totalWeight, totalNutrition };
}

function getRecipes()   { return store.get('my:recipes') || []; }
function saveRecipes(r) { store.set('my:recipes', r); }

// ─── Ingredient Search Panel ───────────────────────────────────────────────────

function IngredientSearch({ onAdd }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [busy,    setBusy]    = useState(false);
  const [grams,   setGrams]   = useState({});
  const [showScan,setShowScan]= useState(false);
  const [scanBusy,setScanBusy]= useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const [u, o] = await Promise.all([searchUSDA(query), searchOFF(query)]);
      setResults([...(u||[]), ...(o||[])].slice(0, 8));
    } catch { setResults([]); }
    setBusy(false);
  };

  const handleBarcode = async (bc) => {
    setShowScan(false); setScanBusy(true);
    const r = await lookupBarcode(bc);
    if (r?.found) {
      const per100g = r.per100g || toPer100g(r);
      onAdd({ name: r.name, grams: 100, per100g });
    }
    setScanBusy(false);
  };

  const add = (food, g) => {
    const per100g = food.per100g || toPer100g(food);
    onAdd({ name: food.name, grams: parseFloat(g) || 100, per100g });
    setQuery(''); setResults([]); setGrams({});
  };

  return (
    <div>
      {showScan && <BarcodeScanner onResult={handleBarcode} onClose={() => setShowScan(false)} />}
      <div style={{ display:'flex', gap:8, marginBottom:10 }}>
        <Input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search ingredient…" style={{ flex:1 }} />
        <Btn onClick={search} disabled={busy} style={{ flexShrink:0 }}>{busy ? '…' : 'Search'}</Btn>
        <button onClick={() => setShowScan(true)}
          style={{ background:T.surfaceHigh, border:`1px solid ${T.border}`, borderRadius:10,
            padding:'0 12px', color:T.accent, cursor:'pointer', fontSize:18, flexShrink:0 }}>
          {scanBusy ? '…' : '📷'}
        </button>
      </div>
      {results.map((f, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px',
          background:T.surfaceHigh, borderRadius:10, marginBottom:8 }}>
          <div style={{ flex:1, fontSize:13, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {f.name}
            <span style={{ color:T.textMuted, fontSize:11, marginLeft:6 }}>
              {(f.per100g || toPer100g(f)).cal} kcal/100g
            </span>
          </div>
          <input type="number" value={grams[i] ?? 100}
            onChange={e => setGrams(prev => ({ ...prev, [i]: e.target.value }))}
            style={{ width:58, background:T.surface, border:`1px solid ${T.border}`,
              borderRadius:8, padding:'6px', color:T.accent, fontWeight:700, fontSize:13, textAlign:'center' }} />
          <span style={{ fontSize:11, color:T.textMuted }}>g</span>
          <Btn onClick={() => add(f, grams[i] ?? 100)} small>Add</Btn>
        </div>
      ))}
    </div>
  );
}

// ─── Create / Edit Form ────────────────────────────────────────────────────────

function RecipeForm({ initial, onSave, onCancel }) {
  const [name,        setName]        = useState(initial?.name || '');
  const [ingredients, setIngredients] = useState(initial?.ingredients || []);
  const [saving,      setSaving]      = useState(false);
  const [shareStatus, setShareStatus] = useState('');

  const addIngredient  = (ing)  => setIngredients(prev => [...prev, { ...ing, id: Date.now() }]);
  const removeIngredient = (id) => setIngredients(prev => prev.filter(i => i.id !== id));
  const updateGrams    = (id, g) => setIngredients(prev =>
    prev.map(i => i.id === id ? { ...i, grams: Math.max(1, parseFloat(g) || 1) } : i)
  );

  const { per100g, totalWeight, totalNutrition } = calcRecipePer100g(ingredients);

  const save = async (share = false) => {
    if (!name.trim() || ingredients.length === 0) return;
    setSaving(true);
    const recipe = {
      id:             initial?.id || String(Date.now()),
      supabaseId:     initial?.supabaseId || null,
      name:           name.trim(),
      ingredients,
      per100g,
      totalWeight,
      totalNutrition,
      createdAt:      initial?.createdAt || new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    };

    // Save locally
    const all = getRecipes();
    const idx = all.findIndex(r => r.id === recipe.id);
    if (idx >= 0) all[idx] = recipe; else all.unshift(recipe);
    saveRecipes(all.slice(0, 50));

    if (share) {
      try {
        setShareStatus('Sharing…');
        const { data, error } = await saveRecipe(recipe);
        if (error) throw error;
        recipe.supabaseId = data?.id || recipe.supabaseId;
        // Update locally with supabaseId
        const all2 = getRecipes();
        const i2 = all2.findIndex(r => r.id === recipe.id);
        if (i2 >= 0) { all2[i2] = recipe; saveRecipes(all2); }

        const link = `${window.location.origin}/?recipe=${recipe.supabaseId}`;
        if (navigator.share) {
          await navigator.share({ title: recipe.name, text: `Check out my recipe: ${recipe.name}`, url: link });
        } else {
          await navigator.clipboard?.writeText(link);
          setShareStatus(`✓ Link copied! Share it with others.`);
        }
      } catch (e) {
        setShareStatus(`❌ ${e.message}`);
      }
    }

    setSaving(false);
    onSave(recipe);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <Card>
        <SectionLabel>📝 RECIPE NAME</SectionLabel>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Noodle with Meat" />
      </Card>

      <Card>
        <SectionLabel>➕ ADD INGREDIENTS</SectionLabel>
        <IngredientSearch onAdd={addIngredient} />
      </Card>

      {ingredients.length > 0 && (
        <Card>
          <SectionLabel>🥘 INGREDIENTS ({ingredients.length})</SectionLabel>
          {ingredients.map(ing => (
            <div key={ing.id} style={{ display:'flex', alignItems:'center', gap:8,
              padding:'10px 0', borderBottom:`1px solid ${T.border}` }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:T.text, fontSize:14, fontWeight:600,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ing.name}</div>
                <div style={{ color:T.textMuted, fontSize:11 }}>
                  {calcFromGrams(ing.per100g, ing.grams).cal} kcal · {ing.per100g.cal} kcal/100g
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                <button onClick={() => updateGrams(ing.id, ing.grams - 5)}
                  style={{ background:T.surfaceHigh, border:`1px solid ${T.border}`, borderRadius:6,
                    width:26, height:26, color:T.text, cursor:'pointer', fontWeight:700, fontSize:14 }}>−</button>
                <input type="number" value={ing.grams}
                  onChange={e => updateGrams(ing.id, e.target.value)}
                  style={{ width:52, background:T.surface, border:`1px solid ${T.accent}`,
                    borderRadius:8, padding:'4px', color:T.accent, fontWeight:800,
                    fontSize:13, textAlign:'center' }} />
                <button onClick={() => updateGrams(ing.id, ing.grams + 5)}
                  style={{ background:T.surfaceHigh, border:`1px solid ${T.border}`, borderRadius:6,
                    width:26, height:26, color:T.text, cursor:'pointer', fontWeight:700, fontSize:14 }}>+</button>
                <span style={{ color:T.textMuted, fontSize:11 }}>g</span>
                <button onClick={() => removeIngredient(ing.id)}
                  style={{ background:'none', border:'none', color:T.red, cursor:'pointer', fontSize:16, padding:'0 4px' }}>✕</button>
              </div>
            </div>
          ))}

          {/* Totals */}
          <div style={{ marginTop:12, padding:'12px', background:T.accentGlow, borderRadius:10 }}>
            <div style={{ fontSize:11, color:T.textMuted, fontWeight:700, marginBottom:6 }}>
              TOTAL RECIPE · {totalWeight}g
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:6 }}>
              <Tag color={T.accent}>{totalNutrition.cal} kcal</Tag>
              <Tag color={T.cyan}>{totalNutrition.protein}g P</Tag>
              <Tag color={T.amber}>{totalNutrition.carbs}g C</Tag>
              <Tag color={T.red}>{totalNutrition.fat}g F</Tag>
            </div>
            <div style={{ fontSize:11, color:T.textMuted }}>
              Per 100g: {per100g.cal} kcal · {per100g.protein}g P · {per100g.carbs}g C · {per100g.fat}g F
            </div>
          </div>
        </Card>
      )}

      {shareStatus && (
        <div style={{ padding:'10px 14px', background:`${shareStatus.startsWith('✓')?T.green:T.red}15`,
          borderRadius:10, color:shareStatus.startsWith('✓')?T.green:T.red, fontSize:13 }}>
          {shareStatus}
        </div>
      )}

      <div style={{ display:'flex', gap:8 }}>
        <Btn onClick={() => save(false)} disabled={saving || !name.trim() || !ingredients.length}
          style={{ flex:1 }}>
          💾 Save Recipe
        </Btn>
        <Btn onClick={() => save(true)} disabled={saving || !name.trim() || !ingredients.length}
          color={T.cyan} style={{ flex:1 }}>
          {saving ? '…' : '🔗 Save & Share'}
        </Btn>
      </div>

      <OutlineBtn onClick={onCancel} style={{ width:'100%' }}>Cancel</OutlineBtn>
    </div>
  );
}

// ─── Use Recipe (log a portion) ────────────────────────────────────────────────

function UseRecipe({ recipe, onLog, onBack }) {
  const [grams, setGrams] = useState(recipe.totalWeight || 100);
  const calc = calcFromGrams(recipe.per100g, grams);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <Card>
        <SectionLabel>🍽️ {recipe.name}</SectionLabel>
        <div style={{ color:T.textMuted, fontSize:13, marginBottom:12 }}>
          Total recipe: {recipe.totalWeight}g · {recipe.per100g.cal} kcal per 100g
        </div>

        <div style={{ fontSize:12, color:T.textMuted, fontWeight:700, marginBottom:8 }}>HOW MANY GRAMS DID YOU EAT?</div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <button onClick={() => setGrams(g => Math.max(1, g - 10))}
            style={{ background:T.surfaceHigh, border:`1px solid ${T.border}`, borderRadius:10,
              width:44, height:44, color:T.text, fontWeight:700, cursor:'pointer', fontSize:22 }}>−</button>
          <input type="number" value={grams} onChange={e => setGrams(Math.max(1, +e.target.value))}
            style={{ flex:1, background:T.surfaceHigh, border:`1px solid ${T.accent}`,
              borderRadius:12, padding:'12px', color:T.accent, fontWeight:900,
              fontSize:22, textAlign:'center', outline:'none' }} />
          <button onClick={() => setGrams(g => g + 10)}
            style={{ background:T.surfaceHigh, border:`1px solid ${T.border}`, borderRadius:10,
              width:44, height:44, color:T.text, fontWeight:700, cursor:'pointer', fontSize:22 }}>+</button>
          <span style={{ color:T.textMuted, fontWeight:700, fontSize:16 }}>g</span>
        </div>

        {/* Quick portions */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
          {[
            { l:'¼',  g: Math.round(recipe.totalWeight * 0.25) },
            { l:'½',  g: Math.round(recipe.totalWeight * 0.5)  },
            { l:'¾',  g: Math.round(recipe.totalWeight * 0.75) },
            { l:'All',g: recipe.totalWeight },
          ].map(p => (
            <button key={p.l} onClick={() => setGrams(p.g)}
              style={{ padding:'6px 14px', background:grams===p.g?T.accent:T.surfaceHigh,
                color:grams===p.g?'#080d14':T.textMuted, border:`1px solid ${grams===p.g?T.accent:T.border}`,
                borderRadius:20, fontWeight:700, cursor:'pointer', fontSize:12 }}>
              {p.l} ({p.g}g)
            </button>
          ))}
        </div>

        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
          <Tag color={T.accent}>{calc.cal} kcal</Tag>
          <Tag color={T.cyan}>{calc.protein}g P</Tag>
          <Tag color={T.amber}>{calc.carbs}g C</Tag>
          <Tag color={T.red}>{calc.fat}g F</Tag>
        </div>

        <Btn onClick={() => onLog({ name: recipe.name, grams, per100g: recipe.per100g, ...calc })}
          style={{ width:'100%', marginBottom:8 }}>
          ✓ Log {grams}g to Food Diary
        </Btn>
        <OutlineBtn onClick={onBack} style={{ width:'100%' }}>← Back</OutlineBtn>
      </Card>

      {/* Ingredients breakdown */}
      {recipe.ingredients?.length > 0 && (
        <Card>
          <SectionLabel>INGREDIENTS</SectionLabel>
          {recipe.ingredients.map((ing, i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between',
              padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
              <span style={{ color:T.text, fontSize:14 }}>{ing.name}</span>
              <span style={{ color:T.textMuted, fontSize:13 }}>
                {Math.round(ing.grams * grams / recipe.totalWeight)}g
                · {Math.round(calcFromGrams(ing.per100g, ing.grams * grams / recipe.totalWeight).cal)} kcal
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ─── Shared Recipe Preview (opened from link) ──────────────────────────────────

export function SharedRecipePreview({ recipeId, onClose }) {
  const [recipe,  setRecipe]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { fetchRecipeById } = await import('../lib/supabase.js');
        const { data, error } = await fetchRecipeById(recipeId);
        if (error || !data) { setError('Recipe not found.'); setLoading(false); return; }
        // Convert DB row to recipe object
        setRecipe({
          id:           data.id,
          supabaseId:   data.id,
          name:         data.name,
          ingredients:  data.ingredients || [],
          per100g:      data.per100g || {},
          totalWeight:  data.total_weight || 0,
          createdByName: data.created_by_name || 'Someone',
        });
      } catch (e) { setError(e.message); }
      setLoading(false);
    })();
  }, [recipeId]);

  const saveToMyRecipes = () => {
    if (!recipe) return;
    const mine = getRecipes();
    if (!mine.find(r => r.supabaseId === recipe.supabaseId)) {
      mine.unshift({ ...recipe, id: String(Date.now()), createdAt: new Date().toISOString() });
      saveRecipes(mine);
    }
    setSaved(true);
  };

  if (loading) return (
    <div style={{ position:'fixed', inset:0, background:T.bg, zIndex:300,
      display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:36 }}>🍳</div>
      <div style={{ color:T.textMuted }}>Loading recipe…</div>
    </div>
  );

  return (
    <div style={{ position:'fixed', inset:0, background:T.bg, zIndex:300,
      overflowY:'auto', padding:16, paddingTop:'calc(16px + env(safe-area-inset-top))' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontWeight:900, color:T.accent, fontSize:18 }}>NUTRYX</div>
        <button onClick={onClose} style={{ background:'none', border:'none', color:T.textMuted, fontSize:22, cursor:'pointer' }}>✕</button>
      </div>

      {error ? (
        <Card><div style={{ color:T.red, textAlign:'center', padding:20 }}>{error}</div></Card>
      ) : recipe && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Card>
            <div style={{ fontSize:11, color:T.textMuted, marginBottom:4 }}>SHARED RECIPE BY {recipe.createdByName?.toUpperCase()}</div>
            <div style={{ fontWeight:900, fontSize:20, color:T.text, marginBottom:12 }}>{recipe.name}</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              <Tag color={T.accent}>{recipe.per100g?.cal} kcal/100g</Tag>
              <Tag color={T.cyan}>{recipe.per100g?.protein}g P</Tag>
              <Tag color={T.amber}>{recipe.per100g?.carbs}g C</Tag>
              <Tag color={T.red}>{recipe.per100g?.fat}g F</Tag>
            </div>
            <div style={{ color:T.textMuted, fontSize:13, marginBottom:14 }}>
              Total: {recipe.totalWeight}g · {recipe.ingredients?.length} ingredients
            </div>
            {saved ? (
              <div style={{ padding:'12px', background:`${T.green}15`, borderRadius:10,
                color:T.green, fontWeight:700, textAlign:'center' }}>
                ✓ Saved to your recipes!
              </div>
            ) : (
              <Btn onClick={saveToMyRecipes} style={{ width:'100%' }}>
                💾 Save to My Recipes
              </Btn>
            )}
          </Card>

          {recipe.ingredients?.length > 0 && (
            <Card>
              <SectionLabel>INGREDIENTS</SectionLabel>
              {recipe.ingredients.map((ing, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between',
                  padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ color:T.text, fontSize:14 }}>{ing.name}</span>
                  <span style={{ color:T.textMuted, fontSize:13 }}>
                    {ing.grams}g · {calcFromGrams(ing.per100g, ing.grams).cal} kcal
                  </span>
                </div>
              ))}
            </Card>
          )}

          <OutlineBtn onClick={onClose} style={{ width:'100%' }}>Close</OutlineBtn>
        </div>
      )}
    </div>
  );
}

// ─── Main RecipeManager ────────────────────────────────────────────────────────

export default function RecipeManager({ onAdd }) {
  const [view,    setView]    = useState('list');   // list | create | edit | use
  const [recipes, setRecipes] = useState(getRecipes);
  const [selected,setSelected]= useState(null);

  const refresh = () => setRecipes(getRecipes());

  const deleteRecipe = async (recipe) => {
    const all = getRecipes().filter(r => r.id !== recipe.id);
    saveRecipes(all);
    if (recipe.supabaseId) {
      try { await deleteSharedRecipe(recipe.supabaseId); } catch {}
    }
    refresh();
  };

  const shareRecipe = async (recipe) => {
    try {
      const { saveRecipe: sr } = await import('../lib/supabase.js');
      const { data, error } = await sr(recipe);
      if (error) throw error;
      const updated = { ...recipe, supabaseId: data?.id || recipe.supabaseId };
      const all = getRecipes();
      const i = all.findIndex(r => r.id === recipe.id);
      if (i >= 0) { all[i] = updated; saveRecipes(all); refresh(); }
      const link = `${window.location.origin}/?recipe=${updated.supabaseId}`;
      if (navigator.share) {
        await navigator.share({ title: recipe.name, text: `Try my recipe: ${recipe.name}`, url: link });
      } else {
        await navigator.clipboard?.writeText(link);
        alert('Link copied! Share it with others.');
      }
    } catch (e) { alert('Share failed: ' + e.message); }
  };

  // List view
  if (view === 'list') return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <Btn onClick={() => { setSelected(null); setView('create'); }} style={{ width:'100%' }}>
        + Create New Recipe
      </Btn>

      {recipes.length === 0 && (
        <Card>
          <div style={{ textAlign:'center', padding:'24px 0', color:T.textMuted }}>
            <div style={{ fontSize:36, marginBottom:8 }}>🍳</div>
            No saved recipes yet. Create your first one!
          </div>
        </Card>
      )}

      {recipes.map(r => (
        <Card key={r.id}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, color:T.text, fontSize:15,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</div>
              <div style={{ color:T.textMuted, fontSize:12, marginTop:2 }}>
                {r.totalWeight}g total · {r.per100g?.cal} kcal/100g · {r.ingredients?.length} ingredients
                {r.supabaseId && <span style={{ color:T.green }}> · 🔗 shared</span>}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <Btn onClick={() => { setSelected(r); setView('use'); }} small style={{ flex:1 }}>
              🍽️ Use
            </Btn>
            <OutlineBtn onClick={() => { setSelected(r); setView('edit'); }} small style={{ flex:1 }}>
              ✏️ Edit
            </OutlineBtn>
            <OutlineBtn onClick={() => shareRecipe(r)} small style={{ flex:1 }}>
              🔗 Share
            </OutlineBtn>
            <OutlineBtn onClick={() => deleteRecipe(r)} color={T.red} small>
              🗑️
            </OutlineBtn>
          </div>
        </Card>
      ))}
    </div>
  );

  if (view === 'create' || view === 'edit') return (
    <RecipeForm
      initial={selected}
      onSave={(recipe) => { refresh(); setView('list'); }}
      onCancel={() => setView('list')}
    />
  );

  if (view === 'use' && selected) return (
    <UseRecipe
      recipe={selected}
      onLog={(meal) => { onAdd(meal); setView('list'); }}
      onBack={() => setView('list')}
    />
  );

  return null;
}

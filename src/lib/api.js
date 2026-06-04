import { store } from './store.js';

// ─── Gemini direct call (no server needed — Gemini supports browser CORS) ───
async function aiGemini(prompt, system, img, imgType){
  const key   = import.meta.env.VITE_GEMINI_KEY || store.get('gemini:key');
  const model = import.meta.env.VITE_GEMINI_MODEL || store.get('gemini:model') || 'gemini-1.5-flash';
  const url   = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`;

  const parts = [];
  if(img) parts.push({ inlineData:{ mimeType: imgType||'image/jpeg', data: img } });
  parts.push({ text: prompt });

  const body = {
    contents: [{ parts }],
    generationConfig: { maxOutputTokens: 1200, temperature: 0.7 },
  };
  if(system) body.systemInstruction = { parts:[{ text: system }] };

  const res = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  if(!res.ok){
    const t = await res.text();
    let msg = t;
    try{
      const j = JSON.parse(t);
      msg = j.error?.message || t;
    }catch{}
    if(res.status===429||msg.includes('quota')||msg.includes('RESOURCE_EXHAUSTED')){
      throw new Error('Gemini quota exceeded. Switch to gemini-1.5-flash (free tier) in Settings → AI Provider.');
    }
    if(res.status===400&&msg.includes('API_KEY')){
      throw new Error('Invalid Gemini API key. Check Settings → AI Provider.');
    }
    throw new Error('Gemini error: '+msg.slice(0,200));
  }
  const d = await res.json();
  const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.replace(/```json[\s\S]*?```|```/g,'').trim();
}

// ─── Anthropic server proxy (fallback) ───────────────────────────────────────
async function aiProxy(prompt, system, img, imgType){
  const payload = { prompt, system, img, imgType };
  const res = await fetch('/api/ai', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
  if(!res.ok){ const t = await res.text(); throw new Error('AI proxy error: '+t); }
  const d = await res.json();
  if(d && typeof d.text === 'string') return d.text.replace(/```json|```/g,'').trim();
  if(d && d.raw){
    const raw = d.raw;
    const text = raw?.content?.find?.(b=>b.type==='text')?.text || raw?.completion || raw?.message || JSON.stringify(raw);
    return String(text).replace(/```json|```/g,'').trim();
  }
  return '';
}

// ─── Public AI entry point ────────────────────────────────────────────────────
export async function ai(prompt, system = 'Respond only with valid JSON.', img = null, imgType = 'image/jpeg'){
  try{
    if(import.meta.env.VITE_GEMINI_KEY || store.get('gemini:key')) return await aiGemini(prompt, system, img, imgType);
    return await aiProxy(prompt, system, img, imgType);
  }catch(err){ console.error('AI request failed', err); throw err; }
}

export function getAIProvider(){ return (import.meta.env.VITE_GEMINI_KEY || store.get('gemini:key')) ? 'gemini' : 'anthropic'; }

// ─── Food database helpers ────────────────────────────────────────────────────
function extractUSDA(food){
  const get=(id)=>{const n=food.foodNutrients?.find(x=>(x.nutrientId||x.nutrient?.id)===id);return +(n?.value||n?.amount||0).toFixed(1);};
  return{ source:'usda', found:true, name:food.description||'Unknown', brand:food.brandOwner||food.brandName||'',
    serving:`${food.servingSize||100}${food.servingSizeUnit||'g'}`, fdcId:food.fdcId,
    perServing:{ cal:get(1008), protein:get(1003), carbs:get(1005), fat:get(1004), fiber:get(1079), sugar:get(2000), sodium:get(1093) }};
}
function extractOFF(p){
  const n=p.nutriments||{};
  return{ source:'openfoodfacts', found:true, name:p.product_name||'Unknown', brand:p.brands||'',
    image:p.image_front_small_url||null, serving:p.serving_size||'100g', nutriscore:p.nutriscore_grade?.toUpperCase()||null,
    perServing:{
      cal:  Math.round(n['energy-kcal_serving']||n['energy-kcal_100g']||0),
      protein: +(n['proteins_serving']||n['proteins_100g']||0).toFixed(1),
      carbs:   +(n['carbohydrates_serving']||n['carbohydrates_100g']||0).toFixed(1),
      fat:     +(n['fat_serving']||n['fat_100g']||0).toFixed(1),
      fiber:   +(n['fiber_serving']||n['fiber_100g']||0).toFixed(1),
      sugar:   +(n['sugars_serving']||n['sugars_100g']||0).toFixed(1),
      sodium:  +((n['sodium_serving']||n['sodium_100g']||0)*1000).toFixed(0),
    }};
}

export async function searchUSDA(q){
  try{
    const body = JSON.stringify({ q, pageSize:12 });
    for(const url of ['/api/usda/search', `${location.protocol}//${location.hostname}:8787/api/usda/search`]){
      try{
        const res = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body });
        if(!res.ok) continue;
        const d = await res.json();
        return (d.foods||[]).map(extractUSDA);
      }catch(e){ console.warn('searchUSDA', url, e); }
    }
    return [];
  }catch(e){ return []; }
}

export async function searchOFF(q){
  const body = JSON.stringify({ q, pageSize:8 });
  for(const url of ['/api/off/search', `${location.protocol}//${location.hostname}:8787/api/off/search`]){
    try{
      const res = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body });
      if(!res.ok) continue;
      const ct = res.headers.get('content-type')||'';
      if(!ct.includes('application/json')) continue;
      const d = await res.json();
      return (d.products||[]).filter(p=>p.product_name).map(extractOFF);
    }catch(e){ console.warn('searchOFF', url, e); }
  }
  try{
    const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=8&fields=product_name,brands,nutriments,serving_size,nutriscore_grade,image_front_small_url`, { headers:{ Accept:'application/json' } });
    if(!r.ok) return [];
    const d = await r.json();
    return (d.products||[]).filter(p=>p.product_name).map(extractOFF);
  }catch(e){ return []; }
}

export async function lookupBarcode(barcode){
  const cached = store.get(`food:bc:${barcode}`);
  if(cached) return { ...cached, found:true, source:'local-db' };
  try{
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const d = await r.json();
    if(d.status===1&&d.product){ const p=extractOFF(d.product); p.barcode=barcode; store.set(`food:bc:${barcode}`,p); return p; }
  }catch{}
  return { found:false };
}

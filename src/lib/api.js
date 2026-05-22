import { store } from './store.js';

// AI proxy (server-side) wrapper — posts to /api/ai
export async function ai(prompt, system = "Respond only with valid JSON.", img = null, imgType = "image/jpeg"){
  try{
    const payload = { prompt, system, img, imgType };
    const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if(!res.ok){ const txt = await res.text(); throw new Error('AI proxy error: '+txt); }
    const d = await res.json();
    if(d && typeof d.text === 'string') return d.text.replace(/```json|```/g,"").trim();
    if(d && d.raw){
      const raw = d.raw;
      const text = raw?.content?.find?.(b=>b.type==="text")?.text || raw?.completion || raw?.message || JSON.stringify(raw);
      return String(text).replace(/```json|```/g,"").trim();
    }
    return '';
  }catch(err){ console.error('AI request failed',err); throw err; }
}

// Food DB helpers
function extractUSDA(food){
  const get=(id)=>{const n=food.foodNutrients?.find(x=>(x.nutrientId||x.nutrient?.id)===id);return +(n?.value||n?.amount||0).toFixed(1);};
  return{source:"usda",found:true,name:food.description||"Unknown",brand:food.brandOwner||food.brandName||"",
    serving:`${food.servingSize||100}${food.servingSizeUnit||"g"}`,fdcId:food.fdcId,
    perServing:{cal:get(1008),protein:get(1003),carbs:get(1005),fat:get(1004),fiber:get(1079),sugar:get(2000),sodium:get(1093)}};
}
function extractOFF(p){
  const n=p.nutriments||{};
  return {
    source: "openfoodfacts",
    found: true,
    name: p.product_name || "Unknown",
    brand: p.brands || "",
    image: p.image_front_small_url || null,
    serving: p.serving_size || "100g",
    nutriscore: p.nutriscore_grade?.toUpperCase() || null,
    perServing: {
      cal: Math.round(n["energy-kcal_serving"] || n["energy-kcal_100g"] || 0),
      protein: +(n["proteins_serving"] || n["proteins_100g"] || 0).toFixed(1),
      carbs: +(n["carbohydrates_serving"] || n["carbohydrates_100g"] || 0).toFixed(1),
      fat: +(n["fat_serving"] || n["fat_100g"] || 0).toFixed(1),
      fiber: +(n["fiber_serving"] || n["fiber_100g"] || 0).toFixed(1),
      sugar: +(n["sugars_serving"] || n["sugars_100g"] || 0).toFixed(1),
      sodium: +((n["sodium_serving"] || n["sodium_100g"] || 0) * 1000).toFixed(0),
    },
  };
}

export async function searchUSDA(q){
  try{
    const body = JSON.stringify({ q, pageSize: 12 });
    const urls = ['/api/usda/search', `${location.protocol}//${location.hostname}:8787/api/usda/search`];
    for(const url of urls){
      try{
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        if(!res.ok){ const txt = await res.text(); console.warn('USDA proxy error', url, res.status, txt.slice(0,200)); continue; }
        const d = await res.json();
        return (d.foods||[]).map(extractUSDA);
      }catch(err){ console.warn('searchUSDA error', url, err); }
    }
    return [];
  }catch(err){ console.warn('searchUSDA error',err); return []; }
}

export async function searchOFF(q){
  const payload = JSON.stringify({ q, pageSize: 8 });
  const candidates = ['/api/off/search', `${location.protocol}//${location.hostname}:8787/api/off/search`];
  for(const url of candidates){
    try{
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
      if(!res.ok){ const txt = await res.text(); console.warn('OFF proxy error', url, res.status, txt.slice(0,200)); continue; }
      const ct = res.headers.get('content-type') || '';
      if(!ct.includes('application/json')){
        const txt = await res.text(); console.warn('OFF proxy non-json', url, ct, txt.slice(0,200)); continue;
      }
      const d = await res.json();
      return (d.products||[]).filter(p=>p.product_name).map(extractOFF);
    }catch(err){ console.warn('searchOFF error', url, err); }
  }
  return [];
}

export async function lookupBarcode(barcode){
  const cached=store.get(`food:bc:${barcode}`);if(cached)return{...cached,found:true,source:"local-db"};
  try{const r=await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);const d=await r.json();
    if(d.status===1&&d.product){const prod=extractOFF(d.product);prod.barcode=barcode;store.set(`food:bc:${barcode}`,prod);return prod;}}catch{}
  return{found:false};
}

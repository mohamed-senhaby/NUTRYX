import React, { useState } from 'react';
import { Tag, Btn, OutlineBtn, T } from '../lib/ui.jsx';
import { store } from '../lib/store.js';

export default function ProductCard({product,onAdd,onRescan,scanType}){
  const[servings,setServings]=useState(1),[saved,setSaved]=useState(false);
  const p=product.perServing;
  const nc={A:"#037d3a",B:"#85bb2f",C:"#fecb02",D:"#ee8100",E:"#e63e11"};
  const srcColor={openfoodfacts:T.green,"local-db":T.purple,"ai-photo":T.cyan,ai:T.amber,usda:T.green};
  const srcLabel={openfoodfacts:"🌍 Open Food Facts","local-db":"⚡ Saved","ai-photo":"✨ AI Photo",ai:"🤖 AI",usda:"🇺🇸 USDA"};
  const handleAdd=()=>{
    const k=`food:n:${(product.name||"").toLowerCase().replace(/\s+/g,"-")}`;
    store.set(k,{...product,savedAt:Date.now()});
    if(product.barcode)store.set(`food:bc:${product.barcode}`,{...product,savedAt:Date.now()});
    setSaved(true);
    onAdd({
      name: `${product.name}${product.brand ? ` (${product.brand})` : ''}`,
      cal: Math.round((p.cal||0) * servings),
      protein: +((p.protein||0) * servings).toFixed(1),
      carbs: +((p.carbs||0) * servings).toFixed(1),
      fat: +((p.fat||0) * servings).toFixed(1)
    });
  };
  return(
    <div style={{marginTop:8,padding:"16px",background:T.accentGlow,borderRadius:14,border:`1px solid ${T.accentDim}`}}>
      <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
        <Tag color={srcColor[product.source]||T.textMuted}>{srcLabel[product.source]||product.source}</Tag>
        {product.nutriscore&&<span style={{background:nc[product.nutriscore]||"#555",color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:800}}>NS-{product.nutriscore}</span>}
      </div>
      <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:14}}>
        {product.image&&<img src={product.image} alt={product.name||"Product image"} style={{width:60,height:60,objectFit:"contain",borderRadius:8,background:"#fff",padding:4,flexShrink:0}}/>}
        <div><div style={{fontWeight:800,color:T.text,fontSize:16,lineHeight:1.3}}>{product.name}</div>{product.brand&&<div style={{color:T.textMuted,fontSize:13,marginTop:2}}>{product.brand}</div>}{product.serving&&<div style={{color:T.textMuted,fontSize:12,marginTop:4}}>Per {product.serving}</div>}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
        {[{l:"Calories",v:p.cal,u:"kcal",c:T.accent},{l:"Protein",v:p.protein,u:"g",c:T.cyan},{l:"Carbs",v:p.carbs,u:"g",c:T.amber},{l:"Fat",v:p.fat,u:"g",c:T.red},{l:"Fiber",v:p.fiber||0,u:"g",c:T.purple},{l:"Sodium",v:p.sodium||0,u:"mg",c:T.orange}].map(m=>(
          <div key={m.l} style={{background:T.surfaceHigh,borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:800,color:m.c}}>{+(m.v*(servings||1)).toFixed(1)}<span style={{fontSize:10,color:T.textMuted}}>{m.u}</span></div>
            <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{m.l}</div>
          </div>
        ))}
      </div>
      {product.insight&&<div style={{marginBottom:14,padding:"10px 12px",background:`${T.cyan}10`,border:`1px solid ${T.cyan}33`,borderRadius:10,fontSize:13,color:T.textMuted,fontStyle:"italic"}}>💡 {product.insight}</div>}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <span style={{color:T.textMuted,fontSize:14,fontWeight:600}}>Servings:</span>
        <div style={{display:"flex",alignItems:"center",gap:10,background:T.surfaceHigh,borderRadius:12,padding:"6px 14px"}}>
          <button onClick={()=>setServings(s=>Math.max(0.25,+(s-0.25).toFixed(2)))} style={{background:"none",border:"none",color:T.accent,fontSize:24,cursor:"pointer",fontWeight:700,lineHeight:1}}>−</button>
          <span style={{color:T.text,fontWeight:800,fontSize:20,minWidth:36,textAlign:"center"}}>{servings}</span>
          <button onClick={()=>setServings(s=>+(s+0.25).toFixed(2))} style={{background:"none",border:"none",color:T.accent,fontSize:24,cursor:"pointer",fontWeight:700,lineHeight:1}}>+</button>
        </div>
        <span style={{color:T.textMuted,fontSize:13}}>{Math.round(p.cal*servings)} kcal</span>
      </div>
      {saved&&<div style={{marginBottom:10,padding:"8px 12px",background:`${T.green}15`,border:`1px solid ${T.green}44`,borderRadius:8,fontSize:13,color:T.green}}>✓ Saved to your database!</div>}
      <div style={{display:"flex",gap:10}}>
        <Btn onClick={handleAdd} style={{flex:1}}>✓ Add to Log</Btn>
        <OutlineBtn onClick={onRescan}>{scanType==="photo"?"📸 Rescan":"🔄 Rescan"}</OutlineBtn>
      </div>
    </div>
  );
}

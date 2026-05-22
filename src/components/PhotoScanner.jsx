import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ai } from '../lib/api.js';
import { Card, Btn, OutlineBtn, Input, T } from '../lib/ui.jsx';

export default function PhotoScanner({onResult,onClose}){
  const fileRef=useRef(null),videoRef=useRef(null),streamRef=useRef(null);
  const[mode,setMode]=useState("choose"),[preview,setPreview]=useState(null),[pType,setPType]=useState("image/jpeg"),[busy,setBusy]=useState(false),[err,setErr]=useState("");
  const stop=useCallback(()=>{streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;},[]);
  const startCam=async()=>{setMode("camera");try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});streamRef.current=s;if(videoRef.current){videoRef.current.srcObject=s;videoRef.current.play();}}catch{setErr("Camera unavailable. Upload a photo instead.");setMode("choose");}};
  const capture=()=>{if(!videoRef.current)return;const c=document.createElement("canvas");c.width=videoRef.current.videoWidth;c.height=videoRef.current.videoHeight;c.getContext("2d").drawImage(videoRef.current,0,0);stop();setPreview(c.toDataURL("image/jpeg",0.9));setPType("image/jpeg");setMode("preview");};
  const handleFile=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{setPreview(ev.target.result);setPType(f.type||"image/jpeg");setMode("preview");};r.readAsDataURL(f);};
  const analyze=async()=>{setBusy(true);setErr("");
    try{const t=await ai(`Look at this food product. Extract all nutrition info. Return ONLY JSON:{"name":"...","brand":"...","serving":"...","perServing":{"cal":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"sodium":0},"nutriscore":null,"insight":"one sentence health insight","confidence":"high|medium|low"}. If not food return {"error":"not food"}.`,
      "You are a nutrition expert. Extract facts from packaging. Return only valid JSON.",preview.split(",")[1],pType);
      const p=JSON.parse(t);if(p.error){setErr("Couldn't identify food. Try a clearer photo.");setBusy(false);return;}onResult(p);} 
    catch{setErr("Analysis failed. Try again.");}setBusy(false);};
  useEffect(()=>()=>stop(),[stop]);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.96)",zIndex:200,display:"flex",flexDirection:"column",padding:"env(safe-area-inset-top) 20px 20px",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0"}}>
        <span style={{fontWeight:800,fontSize:18,color:T.cyan}}>📸 Photo Scan</span>
        <button onClick={()=>{stop();onClose();}} style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,color:T.text,borderRadius:10,padding:"8px 16px",fontWeight:700,cursor:"pointer",fontSize:14}}>Close</button>
      </div>
      {mode==="choose"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
        <Card style={{textAlign:"center",padding:24,color:T.textMuted,fontSize:15,lineHeight:1.7}}>Point at the <b style={{color:T.text}}>front of any package</b> or <b style={{color:T.text}}>nutrition label</b>. AI reads everything.</Card>
        <Btn onClick={startCam} color={T.cyan} style={{width:"100%"}}>📷 Take Photo</Btn>
        <OutlineBtn onClick={()=>fileRef.current?.click()} style={{width:"100%"}}>🖼️ Upload from Gallery</OutlineBtn>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
        {err&&<div style={{color:T.red,fontSize:13,textAlign:"center",padding:10}}>{err}</div>}
      </div>}
      {mode==="camera"&&<div style={{display:"flex",flexDirection:"column",gap:12,flex:1}}>
        <div style={{position:"relative",borderRadius:20,overflow:"hidden",background:"#000",flex:1,maxHeight:"55vh",border:`2px solid ${T.cyan}66`}}>
          <video ref={videoRef} muted playsInline style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
            <div style={{width:"85%",height:"80%",border:`2px dashed ${T.cyan}66`,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{color:`${T.cyan}88`,fontSize:13,background:"rgba(0,0,0,0.6)",padding:"6px 14px",borderRadius:10}}>Point at label or front</span>
            </div>
          </div>
        </div>
        <Btn onClick={capture} color={T.cyan} style={{width:"100%"}}>📸 Capture</Btn>
        <OutlineBtn onClick={()=>{stop();setMode("choose");}} style={{width:"100%"}}>← Back</OutlineBtn>
      </div>}
      {mode==="preview"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
        <img src={preview} alt="Photo preview" style={{width:"100%",borderRadius:16,border:`2px solid ${T.cyan}44`,maxHeight:"45vh",objectFit:"contain",background:"#111"}}/>
        {busy?<div style={{textAlign:"center",padding:"24px 0",color:T.textMuted}}><div style={{fontSize:36,animation:"spin 1.2s linear infinite",display:"inline-block"}}>✨</div><div style={{fontSize:14,marginTop:10}}>Reading product…</div></div>
        :<><Btn onClick={analyze} color={T.cyan} style={{width:"100%"}}>✨ Analyze with AI</Btn><OutlineBtn onClick={()=>{setPreview(null);setMode("choose");setErr("");}} style={{width:"100%"}}>← Retake</OutlineBtn></>}
        {err&&<div style={{color:T.red,fontSize:13,padding:"10px 14px",background:`${T.red}15`,borderRadius:10,border:`1px solid ${T.red}33`}}>{err}</div>}
      </div>}
    </div>
  );
}

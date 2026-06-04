import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ai } from '../lib/api.js';
import { Btn, OutlineBtn, T } from '../lib/ui.jsx';

export default function PhotoScanner({onResult,onClose}){
  const fileRef=useRef(null),videoRef=useRef(null),streamRef=useRef(null);
  const[mode,setMode]=useState("choose"),[preview,setPreview]=useState(null),[pType,setPType]=useState("image/jpeg"),[busy,setBusy]=useState(false),[err,setErr]=useState("");

  const stop=useCallback(()=>{
    try{ if(streamRef.current){ streamRef.current.getTracks().forEach(t=>{ try{t.stop();}catch{} }); streamRef.current=null; } }catch{}
  },[]);

  const close=()=>{ stop(); onClose(); };

  const startCam=async()=>{
    setMode("camera");
    if(!navigator?.mediaDevices?.getUserMedia){
      setErr("Camera not available. Upload a photo instead.");
      setMode("choose"); return;
    }
    try{
      const s=await navigator.mediaDevices.getUserMedia({
        video:{ facingMode:{ideal:"environment"} }
      });
      streamRef.current=s;
      if(videoRef.current){videoRef.current.srcObject=s;videoRef.current.play();}
    }catch(e){
      const msg=e?.name==="NotAllowedError"?"Camera permission denied — allow it in browser settings."
        :e?.name==="NotFoundError"?"No camera found on this device."
        :"Camera unavailable. Upload a photo instead.";
      setErr(msg);
      setMode("choose");
    }
  };

  const capture=()=>{
    if(!videoRef.current)return;
    const c=document.createElement("canvas");
    c.width=videoRef.current.videoWidth;c.height=videoRef.current.videoHeight;
    c.getContext("2d").drawImage(videoRef.current,0,0);
    stop();setPreview(c.toDataURL("image/jpeg",0.9));setPType("image/jpeg");setMode("preview");
  };

  const handleFile=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{setPreview(ev.target.result);setPType(f.type||"image/jpeg");setMode("preview");};
    r.readAsDataURL(f);
  };

  const analyze=async()=>{
    setBusy(true);setErr("");
    try{
      const t=await ai(
        `Look at this food product. Extract all nutrition info. Return ONLY JSON:{"name":"...","brand":"...","serving":"...","perServing":{"cal":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"sodium":0},"insight":"one sentence health insight"}. If not food return {"error":"not food"}.`,
        "You are a nutrition expert. Extract facts from packaging. Return only valid JSON.",
        preview.split(",")[1],pType
      );
      const p=JSON.parse(t);
      if(p.error){setErr("Couldn't identify food. Try a clearer photo.");setBusy(false);return;}
      onResult(p);
    }catch{setErr("Analysis failed. Try again.");}
    setBusy(false);
  };

  useEffect(()=>()=>stop(),[stop]);

  return(
    <div style={{position:"fixed",inset:0,background:"#000",zIndex:200,display:"flex",flexDirection:"column",
      paddingTop:"env(safe-area-inset-top)"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",background:"rgba(0,0,0,0.8)"}}>
        <span style={{fontWeight:800,fontSize:17,color:T.cyan}}>📸 Photo Scan</span>
        <button onClick={close}
          style={{background:T.red,border:"none",color:"#fff",borderRadius:10,padding:"10px 20px",fontWeight:800,cursor:"pointer",fontSize:15,minWidth:80,minHeight:44}}>
          ✕ Close
        </button>
      </div>

      {/* Choose mode */}
      {mode==="choose"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:14,padding:24,justifyContent:"center"}}>
          <div style={{color:"#888",fontSize:14,textAlign:"center",lineHeight:1.6,marginBottom:8}}>
            Point at the <b style={{color:"#fff"}}>front of any package</b> or <b style={{color:"#fff"}}>nutrition label</b>. AI reads everything.
          </div>
          <Btn onClick={startCam} color={T.cyan} style={{width:"100%",padding:"14px"}}>📷 Take Photo</Btn>
          <OutlineBtn onClick={()=>fileRef.current?.click()} style={{width:"100%",padding:"14px"}}>🖼️ Upload from Gallery</OutlineBtn>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
          {err&&<div style={{color:T.red,fontSize:13,textAlign:"center",padding:10}}>{err}</div>}
        </div>
      )}

      {/* Camera mode */}
      {mode==="camera"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:12,padding:"0 20px 20px"}}>
          <div style={{position:"relative",borderRadius:16,overflow:"hidden",background:"#111",flex:1,maxHeight:"55vh"}}>
            <video ref={videoRef} muted playsInline style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
              <div style={{width:"85%",height:"80%",border:`2px dashed ${T.cyan}66`,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{color:`${T.cyan}99`,fontSize:13,background:"rgba(0,0,0,0.6)",padding:"6px 14px",borderRadius:10}}>Point at label or front</span>
              </div>
            </div>
          </div>
          <Btn onClick={capture} color={T.cyan} style={{width:"100%",padding:"14px"}}>📸 Capture</Btn>
          <OutlineBtn onClick={()=>{stop();setMode("choose");}} style={{width:"100%"}}>← Back</OutlineBtn>
        </div>
      )}

      {/* Preview mode */}
      {mode==="preview"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:12,padding:"0 20px 20px",overflowY:"auto"}}>
          <img src={preview} alt="preview" style={{width:"100%",borderRadius:16,border:`2px solid ${T.cyan}44`,maxHeight:"45vh",objectFit:"contain",background:"#111"}}/>
          {busy?(
            <div style={{textAlign:"center",padding:"24px 0",color:"#888"}}>
              <div style={{fontSize:36}}>✨</div>
              <div style={{fontSize:14,marginTop:10}}>Reading product…</div>
            </div>
          ):(
            <>
              <Btn onClick={analyze} color={T.cyan} style={{width:"100%",padding:"14px"}}>✨ Analyze with AI</Btn>
              <OutlineBtn onClick={()=>{setPreview(null);setMode("choose");setErr("");}} style={{width:"100%"}}>← Retake</OutlineBtn>
            </>
          )}
          {err&&<div style={{color:T.red,fontSize:13,padding:"10px 14px",background:`${T.red}15`,borderRadius:10}}>{err}</div>}
        </div>
      )}

      {/* Bottom padding for home indicator */}
      <div style={{height:"env(safe-area-inset-bottom)",background:"#000"}}/>
    </div>
  );
}

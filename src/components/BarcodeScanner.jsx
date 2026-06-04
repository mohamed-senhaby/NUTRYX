import React, { useRef, useEffect, useState, useCallback } from 'react';
import { L } from '../lib/i18n.js';
import { Input, Btn, T } from '../lib/ui.jsx';

export default function BarcodeScanner({onResult,onClose}){
  const videoRef=useRef(null),streamRef=useRef(null),intervalRef=useRef(null),canvasRef=useRef(document.createElement("canvas"));
  const[status,setStatus]=useState("starting"),[errMsg,setErrMsg]=useState(""),[manual,setManual]=useState(""),[hint,setHint]=useState("Point camera at barcode");

  const stop=useCallback(()=>{
    try{ clearInterval(intervalRef.current); }catch{}
    try{ if(streamRef.current){ streamRef.current.getTracks().forEach(t=>{ try{t.stop();}catch{} }); streamRef.current=null; } }catch{}
  },[]);

  const close=()=>{ stop(); onClose(); };

  useEffect(()=>{
    let ok=true;
    const startCam=async()=>{
      if(!navigator?.mediaDevices?.getUserMedia){
        setErrMsg("Camera API not available in this browser.");
        setStatus("no-camera"); return;
      }
      try{
        // Use "ideal" not "exact" — works on iOS Safari without throwing
        const s=await navigator.mediaDevices.getUserMedia({
          video:{ facingMode:{ideal:"environment"}, width:{ideal:1280}, height:{ideal:720} }
        });
        if(!ok){try{s.getTracks().forEach(t=>t.stop());}catch{}return;}
        streamRef.current=s;
        if(videoRef.current){
          videoRef.current.srcObject=s;
          await videoRef.current.play();
          setStatus("scanning");
        }
      }catch(e){
        const msg=e?.name==="NotAllowedError"?"Camera permission denied. Allow camera in browser settings."
          :e?.name==="NotFoundError"?"No camera found on this device."
          :`Camera error: ${e?.message||e?.name||"unknown"}`;
        setErrMsg(msg);
        setStatus("no-camera");
      }
    };
    startCam();
    return()=>{ok=false;stop();};
  },[stop]);

  useEffect(()=>{
    if(status!=="scanning")return;
    let frameCount=0;
    const scan=async()=>{
      const v=videoRef.current;if(!v||v.readyState<2)return;
      frameCount++;
      if(frameCount===15)setHint("Hold steady, make sure barcode is well lit 💡");
      if(frameCount===40)setHint("Try moving closer to the barcode 🔍");
      const c=canvasRef.current;
      c.width=v.videoWidth;c.height=v.videoHeight;
      c.getContext("2d").drawImage(v,0,0);
      if(window.BarcodeDetector){
        try{const bd=new window.BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code"]});
          const codes=await bd.detect(c);if(codes.length>0){stop();onResult(codes[0].rawValue);return;}}catch{}
      }
    };
    const loadLib=(src)=>new Promise(res=>{if(document.querySelector(`script[src="${src}"]`)){res();return;}const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=res;document.head.appendChild(s);});
    loadLib("https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js").then(()=>{
      intervalRef.current=setInterval(scan,400);
    });
    return()=>{ try{clearInterval(intervalRef.current);}catch{} };
  },[status,onResult,stop]);

  return(
    <div style={{position:"fixed",inset:0,background:"#000",zIndex:200,display:"flex",flexDirection:"column"}}>

      {/* Safe area top spacer */}
      <div style={{height:"env(safe-area-inset-top)",background:"#000",flexShrink:0}}/>

      {/* Title */}
      <div style={{padding:"12px 20px",background:"rgba(0,0,0,0.8)",flexShrink:0}}>
        <span style={{fontWeight:800,fontSize:17,color:T.accent}}>📷 Scan Barcode</span>
      </div>

      {/* Camera area */}
      {status!=="no-camera"&&(
        <div style={{position:"relative",flex:1,background:"#000",maxHeight:"50vh"}}>
          <video ref={videoRef} muted playsInline style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          {status==="starting"&&(
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:14}}>
              Starting camera…
            </div>
          )}
          {status==="scanning"&&(
            <div style={{position:"absolute",bottom:16,left:0,right:0,textAlign:"center"}}>
              <div style={{background:"rgba(0,0,0,0.7)",color:"#fff",fontSize:13,padding:"8px 16px",borderRadius:20,display:"inline-block"}}>{hint}</div>
            </div>
          )}
        </div>
      )}

      {/* No camera state */}
      {status==="no-camera"&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,padding:24,textAlign:"center"}}>
          <div style={{fontSize:56}}>📵</div>
          <div style={{color:"#fff",fontSize:16,fontWeight:700}}>Camera unavailable</div>
          <div style={{color:"#f87171",fontSize:13,maxWidth:280}}>{errMsg||"Camera could not be started."}</div>
          <div style={{color:"#888",fontSize:13}}>Enter the barcode number manually below instead.</div>
          <button onClick={close} style={{background:T.red,border:"none",color:"#fff",borderRadius:12,padding:"14px 40px",fontWeight:800,cursor:"pointer",fontSize:16,marginTop:4}}>
            Close
          </button>
        </div>
      )}

      {/* Manual entry + close */}
      <div style={{padding:"14px 20px",background:"rgba(0,0,0,0.9)",flexShrink:0}}>
        <div style={{fontSize:12,color:"#888",fontWeight:700,letterSpacing:1,marginBottom:8}}>ENTER BARCODE MANUALLY</div>
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <Input value={manual} onChange={e=>setManual(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&manual.trim()&&(stop(),onResult(manual.trim()))}
            placeholder="e.g. 8410076901033" type="number"/>
          <Btn onClick={()=>manual.trim()&&(stop(),onResult(manual.trim()))} style={{flexShrink:0}}>Look Up</Btn>
        </div>
        <button onClick={close}
          style={{width:"100%",background:T.red,border:"none",color:"#fff",borderRadius:12,
            padding:"14px",fontWeight:800,cursor:"pointer",fontSize:16,
            marginBottom:"env(safe-area-inset-bottom)"}}>
          ✕ Close
        </button>
      </div>
    </div>
  );
}

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { L } from '../lib/i18n.js';
import { Input, Btn, T } from '../lib/ui.jsx';

export default function BarcodeScanner({onResult,onClose}){
  const videoRef=useRef(null),streamRef=useRef(null),intervalRef=useRef(null),canvasRef=useRef(document.createElement("canvas"));
  const[status,setStatus]=useState("starting"),[manual,setManual]=useState(""),[hint,setHint]=useState("Point camera at barcode");

  const stop=useCallback(()=>{
    try{ clearInterval(intervalRef.current); }catch{}
    try{ if(streamRef.current){ streamRef.current.getTracks().forEach(t=>{ try{t.stop();}catch{} }); streamRef.current=null; } }catch{}
  },[]);

  const close=()=>{ stop(); onClose(); };

  useEffect(()=>{
    let ok=true;
    const startCam=async()=>{
      try{
        const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{exact:"environment"}}})
          .catch(()=>navigator.mediaDevices.getUserMedia({video:true}));
        if(!ok){try{s.getTracks().forEach(t=>t.stop());}catch{}return;}
        streamRef.current=s;
        if(videoRef.current){videoRef.current.srcObject=s;await videoRef.current.play();setStatus("scanning");}
      }catch(e){setStatus("no-camera");}
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
    <div style={{position:"fixed",inset:0,background:"#000",zIndex:200,display:"flex",flexDirection:"column",
      paddingTop:"env(safe-area-inset-top)"}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",background:"rgba(0,0,0,0.8)"}}>
        <span style={{fontWeight:800,fontSize:17,color:T.accent}}>📷 Scan Barcode</span>
        <button onClick={close}
          style={{background:T.red,border:"none",color:"#fff",borderRadius:10,padding:"10px 20px",fontWeight:800,cursor:"pointer",fontSize:15,minWidth:80,minHeight:44}}>
          ✕ Close
        </button>
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
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:24,textAlign:"center"}}>
          <div style={{fontSize:56}}>📵</div>
          <div style={{color:"#fff",fontSize:16,fontWeight:700}}>Camera unavailable</div>
          <div style={{color:"#888",fontSize:14}}>Enter the barcode number manually below</div>
          <button onClick={close}
            style={{background:T.red,border:"none",color:"#fff",borderRadius:12,padding:"14px 40px",fontWeight:800,cursor:"pointer",fontSize:16,marginTop:8}}>
            Close
          </button>
        </div>
      )}

      {/* Manual entry */}
      <div style={{padding:"16px 20px",paddingBottom:"calc(16px + env(safe-area-inset-bottom))",background:"rgba(0,0,0,0.9)"}}>
        <div style={{fontSize:12,color:"#888",fontWeight:700,letterSpacing:1,marginBottom:10}}>ENTER BARCODE MANUALLY</div>
        <div style={{display:"flex",gap:10}}>
          <Input value={manual} onChange={e=>setManual(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&manual.trim()&&(stop(),onResult(manual.trim()))}
            placeholder="e.g. 8410076901033" type="number"/>
          <Btn onClick={()=>manual.trim()&&(stop(),onResult(manual.trim()))} style={{flexShrink:0}}>Look Up</Btn>
        </div>
      </div>
    </div>
  );
}

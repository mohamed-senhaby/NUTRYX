import React, { useRef, useEffect, useState, useCallback } from 'react';
import { L } from '../lib/i18n.js';
import { Input, Btn, T } from '../lib/ui.jsx';

export default function BarcodeScanner({onResult,onClose}){
  const videoRef=useRef(null),streamRef=useRef(null),intervalRef=useRef(null),canvasRef=useRef(document.createElement("canvas"));
  const[status,setStatus]=useState("starting"),[manual,setManual]=useState(""),[hint,setHint]=useState(L('barcodeHint')||"Point camera at barcode");
  const stop=useCallback(()=>{
    clearInterval(intervalRef.current);
    if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}
  },[]);

  useEffect(()=>{
    let ok=true;
    const startCam=async()=>{
      try{
        const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{exact:"environment"},width:{ideal:1920},height:{ideal:1080}}}).catch(()=>
          navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}}));
        if(!ok){s.getTracks().forEach(t=>t.stop());return;}
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
      if(frameCount===70)setHint("Try angling the camera slightly 📐");
      const c=canvasRef.current;
      c.width=v.videoWidth;c.height=v.videoHeight;
      const ctx=c.getContext("2d");
      ctx.drawImage(v,0,0);

      if(window.BarcodeDetector){
        try{const bd=new window.BarcodeDetector({formats:["ean_13","ean_8","upc_a","upc_e","code_128","code_39","qr_code","itf","codabar"]});
          const codes=await bd.detect(c);if(codes.length>0){stop();onResult(codes[0].rawValue);return;}}catch{}
      }

      if(window.ZXing){
        try{const reader=new window.ZXing.BrowserMultiFormatReader();
          const hints=new Map();hints.set(window.ZXing.DecodeHintType?.TRY_HARDER,[true]);
          const imgData=c.toDataURL("image/png");const result=await reader.decodeFromImageUrl(imgData);if(result){stop();onResult(result.getText());return;}}catch{}
      }

      if(window.Quagga){
        try{const imgData=c.toDataURL("image/jpeg",0.9);
          window.Quagga.decodeSingle({src:imgData,numOfWorkers:0,inputStream:{size:800},decoder:{readers:["ean_reader","ean_8_reader","upc_reader","upc_e_reader","code_128_reader","code_39_reader"]}},r=>{
            if(r&&r.codeResult){stop();onResult(r.codeResult.code);}
          });}catch{}
      }
    };

    const loadLib=(src)=>new Promise(res=>{if(document.querySelector(`script[src="${src}"]`)){res();return;}const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=res;document.head.appendChild(s);});
    Promise.all([
      loadLib("https://cdnjs.cloudflare.com/ajax/libs/zxing-js/0.20.0/zxing.min.js"),
      loadLib("https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js"),
    ]).then(()=>{intervalRef.current=setInterval(scan,400);});
    return()=>clearInterval(intervalRef.current);
  },[status,onResult,stop]);

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.96)",zIndex:200,display:"flex",flexDirection:"column",padding:"env(safe-area-inset-top) 20px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0"}}>
        <span style={{fontWeight:800,fontSize:18,color:T.accent}}>📷 Scan Barcode</span>
        <button onClick={()=>{stop();onClose();}} style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,color:T.text,borderRadius:10,padding:"8px 16px",fontWeight:700,cursor:"pointer",fontSize:14}}>Close</button>
      </div>
      <div style={{position:"relative",borderRadius:20,overflow:"hidden",background:"#000",flex:1,maxHeight:"55vh",border:`2px solid ${T.accent}44`}}>
        <video ref={videoRef} muted playsInline style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        {status==="scanning"&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
          <div style={{width:"75%",height:"28%",position:"relative"}}>
            {[{top:0,left:0,borderTop:`3px solid ${T.accent}`,borderLeft:`3px solid ${T.accent}`},{top:0,right:0,borderTop:`3px solid ${T.accent}`,borderRight:`3px solid ${T.accent}`},{bottom:0,left:0,borderBottom:`3px solid ${T.accent}`,borderLeft:`3px solid ${T.accent}`},{bottom:0,right:0,borderBottom:`3px solid ${T.accent}`,borderRight:`3px solid ${T.accent}`}].map((s,i)=><div key={i} style={{position:"absolute",width:28,height:28,...s}}/>) }
            <div style={{position:"absolute",left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${T.accent},transparent)`,boxShadow:`0 0 8px ${T.accent}`,animation:"scanLine 1.8s ease-in-out infinite"}}/>
          </div>
          <div style={{position:"absolute",bottom:20,left:0,right:0,textAlign:"center"}}>
            <div style={{background:"rgba(0,0,0,0.7)",color:T.text,fontSize:13,padding:"8px 16px",borderRadius:20,display:"inline-block"}}>{hint}</div>
          </div>
        </div>}
        {status==="starting"&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:T.textMuted,fontSize:14}}>Starting camera…</div>}
        {status==="no-camera"&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,padding:24,textAlign:"center"}}><span style={{fontSize:48}}>📵</span><span style={{color:T.textMuted,fontSize:14}}>Camera unavailable — use manual entry below</span></div>}
      </div>
      <div style={{marginTop:16}}>
        <div style={{fontSize:12,color:T.textMuted,fontWeight:700,letterSpacing:1,marginBottom:10}}>ENTER BARCODE MANUALLY</div>
        <div style={{display:"flex",gap:10}}>
          <Input value={manual} onChange={e=>setManual(e.target.value)} onKeyDown={e=>e.key==="Enter"&&manual.trim()&&(stop(),onResult(manual.trim()))} placeholder="e.g. 8410076901033" type="number"/>
          <Btn onClick={()=>manual.trim()&&(stop(),onResult(manual.trim()))} style={{flexShrink:0,whiteSpace:"nowrap"}}>Look Up</Btn>
        </div>
      </div>
    </div>
  );
}

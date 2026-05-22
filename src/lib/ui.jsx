import React, { useState, useEffect, useRef } from 'react';

export const T={
  bg:"#080d14",surface:"#0d1520",surfaceHigh:"#111e2e",
  accent:"#3b82f6",accentDim:"#1e3a5f",accentGlow:"rgba(59,130,246,0.15)",
  text:"#e8f0fe",textMuted:"#5d82b4",
  red:"#f87171",green:"#4ade80",amber:"#fbbf24",purple:"a78bfa",orange:"fb923c",cyan:"#22d3ee",
  border:"rgba(59,130,246,0.15)",
};

export const Card = ({children,style={}})=>(
  <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:"16px 18px",...style}}>{children}</div>
);
export const Tag = ({children,color})=>(<span style={{background:`${color}22`,color,border:`1px solid ${color}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>{children}</span>);
export const Btn = ({children,onClick,color=T.accent,disabled,style={},small})=> (
  <button onClick={onClick} disabled={disabled}
    style={{background:disabled?"#1e3a5f":color,color:color===T.accent||color===T.green||color===T.amber?"#080d14":"#fff",
      border:"none",borderRadius:small?8:12,padding:small?"8px 14px":"13px 20px",fontWeight:700,
      cursor:disabled?"not-allowed":"pointer",fontSize:small?12:15,transition:"all 0.15s",width:style.width,...style}}>
    {children}
  </button>
);
export const OutlineBtn = ({children,onClick,color=T.textMuted,style={},small})=> (
  <button onClick={onClick} style={{background:"transparent",color,border:`1px solid ${color}55`,
    borderRadius:small?8:12,padding:small?"8px 14px":"13px 20px",fontWeight:600,cursor:"pointer",fontSize:small?12:15,...style}}>
    {children}
  </button>
);
export const Ring = ({pct,color,size=76,stroke=7})=>{
  const r=(size-stroke*2)/2,circ=2*Math.PI*r,dash=Math.min((pct/100)*circ,circ);
  return(<svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth={stroke}/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
      strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
      style={{transition:"stroke-dasharray .8s cubic-bezier(.4,0,.2,1)",filter:`drop-shadow(0 0 5px ${color})`}}/>
  </svg>);
};
export const Input = ({value,onChange,onKeyDown,placeholder,style={},type="text"})=> (
  <input type={type} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder}
    style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,borderRadius:12,padding:"13px 16px",
      color:T.text,fontSize:16,outline:"none",width:"100%",...style}}/>
);
export const SectionLabel = ({children})=>(<div style={{fontWeight:700,color:T.textMuted,fontSize:11,letterSpacing:1.2,marginBottom:12}}>{children}</div>);

// Hint / Tooltip system
let _activeHintClose = null;
export function Hint({title,children,icon="💡",color=T.amber}){
  const[open,setOpen]=useState(false);
  const[pos,setPos]=useState({top:0,left:0,right:"auto",transformOrigin:"top left"});
  const btnRef=useRef(null);

  const toggle=()=>{
    if(open){setOpen(false);_activeHintClose=null;return;}
    if(_activeHintClose)_activeHintClose();
    if(btnRef.current){
      const rect=btnRef.current.getBoundingClientRect();
      const vw=window.innerWidth;
      const vh=window.innerHeight;
      const boxW=Math.min(280,vw-32);
      const spaceRight=vw-rect.right-8;
      const spaceLeft=rect.left-8;
      const spaceBelow=vh-rect.bottom-8;
      const spaceAbove=rect.top-8;

      let left,top,transformOrigin;
      if(spaceRight>=boxW){ left=rect.right+8; transformOrigin="top left"; }
      else if(spaceLeft>=boxW){ left=rect.left-boxW-8; transformOrigin="top right"; }
      else { left=Math.max(16,Math.min(rect.left-boxW/2+13,vw-boxW-16)); transformOrigin="top center"; }
      if(spaceBelow>=120){ top=rect.bottom+6; }
      else if(spaceAbove>=120){ top=rect.top-6; transformOrigin=transformOrigin.replace("top","bottom"); }
      else { top=Math.max(60,rect.top-80); }

      // compute arrow position so it visually points at the button center
      const anchorX = rect.left + rect.width/2;
      let arrowLeft = Math.round(anchorX - left - 5); // center minus half arrow width
      arrowLeft = Math.max(10, Math.min(arrowLeft, boxW - 18));

      setPos({top,left,width:boxW,transformOrigin,flipY:spaceBelow<120&&spaceAbove>=120,arrowLeft});
    }
    setOpen(true);
    _activeHintClose=()=>setOpen(false);
  };

  useEffect(()=>{
    if(!open)return;const handler=(e)=>{if(btnRef.current&&!btnRef.current.closest('[data-hint]')?.contains(e.target)){setOpen(false);_activeHintClose=null;}};
    setTimeout(()=>document.addEventListener("click",handler),10);
    return()=>document.removeEventListener("click",handler);
  },[open]);

  return(
    <div data-hint="1" style={{display:"inline-flex",alignItems:"center",position:"relative"}}>
      <button ref={btnRef} onClick={toggle}
        style={{background:open?`${color}33`:`${color}15`,border:`1px solid ${color}${open?"88":"44"}`,borderRadius:20,
          width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",
          cursor:"pointer",fontSize:12,fontWeight:800,color,flexShrink:0,transition:"all 0.15s",
          boxShadow:open?`0 0 0 3px ${color}22`:"none"}}>?</button>

      {open&&(
        <>
          <div onClick={()=>{setOpen(false);_activeHintClose=null;}} style={{position:"fixed",inset:0,zIndex:298}}/>
          <div style={{
            position:"fixed",
            top:pos.top,
            left:pos.left,
            width:pos.width,
            zIndex:299,
            background:T.surface,
            border:`1.5px solid ${color}88`,
            borderRadius:14,
            padding:"14px 16px",
            boxShadow:`0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px ${color}22`,
            transform:pos.flipY?"translateY(-100%)":"none",
            transformOrigin:pos.transformOrigin,
            animation:"hintPop 0.18s cubic-bezier(.34,1.56,.64,1) both",
          }}>
            <div style={{
              position:"absolute",
              width:10,height:10,
              background:T.surface,
              border:`1.5px solid ${color}88`,
              transform:"rotate(45deg)",
              left: (pos && typeof pos.arrowLeft !== 'undefined') ? pos.arrowLeft : 14,
              top: pos && pos.flipY ? 'auto' : -6,
              bottom: pos && pos.flipY ? -6 : 'auto',
            }}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>{icon}</span>
                <span style={{fontWeight:800,color:T.text,fontSize:14}}>{title}</span>
              </div>
              <button onClick={()=>{setOpen(false);_activeHintClose=null;}}
                style={{background:T.surfaceHigh,border:"none",color:T.textMuted,fontSize:16,cursor:"pointer",
                  lineHeight:1,width:24,height:24,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
            </div>
            <div style={{color:T.textMuted,fontSize:13,lineHeight:1.7,whiteSpace:"pre-line"}}>{children}</div>
          </div>
        </>
      )}
    </div>
  );
}

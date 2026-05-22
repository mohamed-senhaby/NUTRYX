import React, { useState } from 'react';
import { L } from '../lib/i18n.js';
import { T } from '../lib/ui.jsx';

export default function FeatureTour({onDone}){
  const[step,setStep]=useState(0);
  const steps=[
    {icon:"🏠",title:L('tour_step1_title'),desc:L('tour_step1_desc')},
    {icon:"🥗",title:L('tour_step2_title'),desc:L('tour_step2_desc')},
    {icon:"📷",title:L('tour_step3_title'),desc:L('tour_step3_desc')},
    {icon:"📸",title:L('tour_step4_title'),desc:L('tour_step4_desc')},
    {icon:"💪",title:L('tour_step5_title'),desc:L('tour_step5_desc')},
    {icon:"💧",title:L('tour_step6_title'),desc:L('tour_step6_desc')},
    {icon:"⚖️",title:L('tour_step7_title'),desc:L('tour_step7_desc')},
    {icon:"🏆",title:L('tour_step8_title'),desc:L('tour_step8_desc')},
  ];
  const s=steps[step];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",padding:"0 20px 40px"}}>
      <div style={{width:"100%",maxWidth:440,background:T.surface,borderRadius:24,padding:28,border:`1px solid ${T.accent}44`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontSize:11,color:T.textMuted,fontWeight:700,letterSpacing:1}}>{step+1} OF {steps.length}</div>
          <button onClick={onDone} style={{background:"none",border:"none",color:T.textMuted,fontSize:13,cursor:"pointer",fontWeight:600}}>{L('tourSkip')}</button>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:20}}>
          {steps.map((_,i) => {
            const bg = i <= step ? T.accent : T.accentDim;
            return <div key={i} style={{flex:1,height:3,borderRadius:2,background:bg,transition:"background 0.3s"}} />;
          })}
        </div>
        <div style={{fontSize:40,marginBottom:12}}>{s.icon}</div>
        <div style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:10}}>{s.title}</div>
        <div style={{fontSize:15,color:T.textMuted,lineHeight:1.7,marginBottom:24}}>{s.desc}</div>
        <div style={{display:"flex",gap:12}}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,background:T.surfaceHigh,border:`1px solid ${T.border}`,color:T.text,borderRadius:14,padding:"14px",fontWeight:700,cursor:"pointer",fontSize:15}}>{L('tourBack')}</button>}
          <button onClick={()=>step===steps.length-1?onDone():setStep(s=>s+1)} style={{flex:2,background:T.accent,color:"#080d14",border:"none",borderRadius:14,padding:"14px",fontWeight:800,cursor:"pointer",fontSize:15}}>{step===steps.length-1?L('tourStart'):L('tourNext')}</button>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { store } from '../lib/store.js';
import { Card, Input, Btn, OutlineBtn, T } from '../lib/ui.jsx';
import { L } from '../lib/i18n.js';

export default function Onboarding({onDone}){
  const[step,setStep]=useState(0);
  const[data,setData]=useState({name:"",age:"",weight:"",height:"",goal:"lose",activity:"moderate",sex:"male",calGoal:2000,proteinGoal:150,waterGoal:8});
  const set=(k,v)=>setData(d=>({...d,[k]:v}));
  const goals=[{v:"lose",l:"🔥 Lose Weight"},{v:"maintain",l:"⚖️ Maintain Weight"},{v:"gain",l:"💪 Gain Muscle"}];
  const acts=[{v:"sedentary",l:"🪑 Sedentary"},{v:"light",l:"🚶 Light Active"},{v:"moderate",l:"🏃 Moderate"},{v:"active",l:"⚡ Very Active"}];
  const calc=()=>{
    const w=parseFloat(data.weight)||75,h=parseFloat(data.height)||170,a=parseFloat(data.age)||25;
    const sex = data.sex || 'male';
    const bmr = Math.round(10*w + 6.25*h - 5*a + (sex === 'male' ? 5 : -161));
    const mult={sedentary:1.2,light:1.375,moderate:1.55,active:1.725}[data.activity]||1.55;
    const tdee=Math.round(bmr*mult);
    const cal=data.goal==="lose"?tdee-400:data.goal==="gain"?tdee+300:tdee;
    set("calGoal",cal);
    set("proteinGoal",Math.round(w*(data.goal==="gain"?2:1.6)));
    set("waterGoal",Math.max(6,Math.round(w*35/250)));
    setStep(3);
  };
  const finish=()=>{store.set("profile",data);store.set("streaks",{water:0,calories:0,workout:0,lastDate:""});onDone(data);};
  return(
    <div style={{minHeight:"100dvh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px 20px"}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:40,fontWeight:900,color:T.accent,letterSpacing:-1}}>NUTRYX</div>
          <div style={{color:T.textMuted,fontSize:14,marginTop:4}}>{L('tagline')}</div>
          <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:20}}>
                {[0,1,2,3].map(i=> <div key={i} style={{width:i===step?28:8,height:8,borderRadius:4,background:i<=step?T.accent:T.accentDim,transition:"all 0.3s"}}/>)}
          </div>
        </div>
        <Card style={{padding:24}}>
          {step===0&&<>
            <div style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:8}}>{L('welcome')}</div>
            <div style={{color:T.textMuted,fontSize:14,marginBottom:20,lineHeight:1.6}}>{L('onboarding_sub')}</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Input value={data.name} onChange={e=>set("name",e.target.value)} placeholder="Your name"/>
              <div style={{display:"flex",gap:10,marginTop:6}}>
                <button onClick={()=>set("sex","male")}
                  style={{background:data.sex==="male"?T.accent:T.surfaceHigh,color:data.sex==="male"?"#080d14":T.text,
                    border:`1px solid ${data.sex==="male"?T.accent:T.border}`,borderRadius:14,padding:"10px 14px",fontWeight:700,cursor:"pointer"}}>Male</button>
                <button onClick={()=>set("sex","female")}
                  style={{background:data.sex==="female"?T.accent:T.surfaceHigh,color:data.sex==="female"?"#080d14":T.text,
                    border:`1px solid ${data.sex==="female"?T.accent:T.border}`,borderRadius:14,padding:"10px 14px",fontWeight:700,cursor:"pointer"}}>Female</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <Input value={data.age} onChange={e=>set("age",e.target.value)} placeholder="Age" type="number"/>
                <Input value={data.weight} onChange={e=>set("weight",e.target.value)} placeholder="kg" type="number"/>
                <Input value={data.height} onChange={e=>set("height",e.target.value)} placeholder="cm" type="number"/>
              </div>
            </div>
            <Btn onClick={()=>setStep(1)} style={{marginTop:20,width:"100%"}}>{L('continueBtn')}</Btn>
          </>}
          {step===1&&<>
            <div style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:20}}>{L('yourGoal')}</div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
              {goals.map(g=><button key={g.v} onClick={()=>set("goal",g.v)}
                style={{background:data.goal===g.v?T.accent:T.surfaceHigh,color:data.goal===g.v?"#080d14":T.text,
                  border:`1px solid ${data.goal===g.v?T.accent:T.border}`,borderRadius:14,padding:"16px 18px",
                  fontWeight:700,cursor:"pointer",fontSize:16,textAlign:"left",transition:"all 0.2s"}}>{g.l}</button>)}
            </div>
            <div style={{display:"flex",gap:10}}>
              <OutlineBtn onClick={()=>setStep(0)} style={{flex:1}}>{L('tourBack')}</OutlineBtn>
              <Btn onClick={()=>setStep(2)} style={{flex:2}}>{L('continueBtn')}</Btn>
            </div>
          </>}
          {step===2&&<>
            <div style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:20}}>{L('activityLevel')}</div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:20}}>
              {acts.map(a=><button key={a.v} onClick={()=>set("activity",a.v)}
                style={{background:data.activity===a.v?T.accent:T.surfaceHigh,color:data.activity===a.v?"#080d14":T.text,
                  border:`1px solid ${data.activity===a.v?T.accent:T.border}`,borderRadius:14,padding:"14px 18px",
                  fontWeight:700,cursor:"pointer",fontSize:15,textAlign:"left",transition:"all 0.2s"}}>{a.l}</button>)}
            </div>
            <div style={{display:"flex",gap:10}}>
              <OutlineBtn onClick={()=>setStep(1)} style={{flex:1}}>{L('tourBack')}</OutlineBtn>
              <Btn onClick={calc} style={{flex:2}}>{L('calculateBtn')}</Btn>
            </div>
          </>}
          {step===3&&<>
            <div style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:4}}>{L('yourGoals')}</div>
            <div style={{color:T.textMuted,fontSize:13,marginBottom:20}}>Calculated for you. Adjust anytime.</div>
            {[{l:"Daily Calories",k:"calGoal",u:"kcal",c:T.accent,step:50},{l:"Protein Goal",k:"proteinGoal",u:"g",c:T.cyan,step:5},{l:"Water Goal",k:"waterGoal",u:"glasses",c:T.accent,step:1}].map(g=>(
              <div key={g.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",borderBottom:`1px solid ${T.border}`}}>
                <span style={{color:T.text,fontWeight:600}}>{g.l}</span>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <button onClick={()=>set(g.k,Math.max(0,data[g.k]-g.step))} style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,width:34,height:34,cursor:"pointer",fontWeight:700,fontSize:16}}>−</button>
                  <span style={{color:g.c,fontWeight:800,fontSize:18,minWidth:70,textAlign:"center"}}>{data[g.k]}{g.u}</span>
                  <button onClick={()=>set(g.k,data[g.k]+g.step)} style={{background:T.surfaceHigh,border:`1px solid ${T.border}`,color:T.text,borderRadius:8,width:34,height:34,cursor:"pointer",fontWeight:700,fontSize:16}}>+</button>
                </div>
              </div>
            ))}
            <Btn onClick={finish} style={{marginTop:20,width:"100%"}}>{L('startApp')}</Btn>
          </>}
        </Card>
      </div>
    </div>
  );
}

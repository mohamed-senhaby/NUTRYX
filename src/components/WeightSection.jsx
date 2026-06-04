import React, { useState, useEffect } from 'react';
import { Card, SectionLabel, T, Input, Btn, OutlineBtn } from '../lib/ui.jsx';
import { L } from '../lib/i18n.js';
import db from '../lib/db.js';

function WeightChart({history}){
  if(!history||history.length<2)return null;
  const pts=history.slice(0,30).reverse();
  const vals=pts.map(e=>e.value);
  const min=Math.min(...vals),max=Math.max(...vals),range=max-min||1;
  const W=300,H=90,PAD=10;
  const cx=(i)=>PAD+(i/(vals.length-1))*(W-PAD*2);
  const cy=(v)=>PAD+(1-(v-min)/range)*(H-PAD*2);
  const points=vals.map((v,i)=>`${cx(i).toFixed(1)},${cy(v).toFixed(1)}`).join(' ');
  const diff=vals[vals.length-1]-vals[0];
  const color=diff<0?T.green:diff>0?T.red:T.textMuted;
  return(
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
        <span style={{color:T.textMuted,fontSize:12}}>Last {vals.length} entries</span>
        <span style={{color,fontSize:13,fontWeight:700}}>{diff>0?'+':''}{diff.toFixed(1)} kg</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:H,display:'block'}}>
        <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.accent} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={T.accent} stopOpacity="0"/>
        </linearGradient></defs>
        <polyline points={points+` ${cx(vals.length-1).toFixed(1)},${H} ${PAD},${H}`} fill="url(#wg)" stroke="none"/>
        <polyline points={points} fill="none" stroke={T.accent} strokeWidth={2} strokeLinejoin="round"/>
        {vals.map((v,i)=><circle key={i} cx={cx(i).toFixed(1)} cy={cy(v).toFixed(1)} r={i===vals.length-1?4:2.5}
          fill={i===vals.length-1?T.accent:T.surfaceHigh} stroke={T.accent} strokeWidth={1.5}/>)}
      </svg>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
        <span style={{color:T.textMuted,fontSize:11}}>{vals[0]} kg</span>
        <span style={{color:T.accent,fontSize:12,fontWeight:700}}>{vals[vals.length-1]} kg now</span>
      </div>
    </div>
  );
}

const MEASURES=[
  {key:'waist',label:'Waist',unit:'cm'},{key:'chest',label:'Chest',unit:'cm'},
  {key:'arms', label:'Arms', unit:'cm'},{key:'hips', label:'Hips', unit:'cm'},
];

function BodyMeasurements(){
  const[values,setValues]=useState({waist:'',chest:'',arms:'',hips:''});
  const[history,setHistory]=useState([]);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    db.getMeasurements(50).then(data=>{ setHistory(data); setLoading(false); }).catch(()=>setLoading(false));
  },[]);

  const save=async()=>{
    const hasAny=MEASURES.some(m=>values[m.key]&&!isNaN(parseFloat(values[m.key])));
    if(!hasAny)return;
    const entry={at:new Date().toISOString()};
    MEASURES.forEach(m=>{ if(values[m.key])entry[m.key]=parseFloat(values[m.key]); });
    await db.saveMeasurement(entry);
    setHistory(prev=>[entry,...prev].slice(0,100));
    setValues({waist:'',chest:'',arms:'',hips:''});
    window.dispatchEvent(new CustomEvent('nutryx:data-changed'));
  };

  const latest=history[0];
  return(
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <Card>
        <SectionLabel>{L('body_measurements')}</SectionLabel>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          {MEASURES.map(m=>(
            <div key={m.key}>
              <div style={{fontSize:11,color:T.textMuted,marginBottom:4,fontWeight:600}}>{m.label} ({m.unit})</div>
              <Input value={values[m.key]} onChange={e=>setValues(v=>({...v,[m.key]:e.target.value}))}
                placeholder={latest?.[m.key]?`Last: ${latest[m.key]}`:`e.g. 80`} type="number"/>
            </div>
          ))}
        </div>
        <Btn onClick={save} style={{width:'100%'}}>{L('save')}</Btn>
      </Card>

      {latest&&(
        <Card>
          <SectionLabel>LATEST MEASUREMENTS</SectionLabel>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
            {MEASURES.filter(m=>latest[m.key]).map(m=>(
              <div key={m.key} style={{background:T.surfaceHigh,borderRadius:10,padding:'10px',textAlign:'center'}}>
                <div style={{fontSize:20,fontWeight:800,color:T.accent}}>{latest[m.key]}<span style={{fontSize:11,color:T.textMuted}}> {m.unit}</span></div>
                <div style={{fontSize:11,color:T.textMuted}}>{m.label}</div>
                {history.length>1&&history[1][m.key]&&(()=>{
                  const diff=latest[m.key]-history[1][m.key];
                  return<div style={{fontSize:11,color:diff<0?T.green:diff>0?T.red:T.textMuted,marginTop:2}}>{diff>0?'+':''}{diff.toFixed(1)}</div>;
                })()}
              </div>
            ))}
          </div>
        </Card>
      )}

      {history.length>0&&(
        <Card>
          <SectionLabel>{L('history')}</SectionLabel>
          {history.slice(0,5).map((e,i)=>(
            <div key={i} style={{padding:'8px 0',borderBottom:i<4?`1px dashed ${T.border}`:'none'}}>
              <div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>{new Date(e.at).toLocaleDateString()}</div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                {MEASURES.filter(m=>e[m.key]).map(m=>(
                  <span key={m.key} style={{fontSize:12,color:T.text}}>{m.label}: <b style={{color:T.accent}}>{e[m.key]}{m.unit}</b></span>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export default function WeightSection(){
  const[tab,setTab]=useState('weight');
  const[history,setHistory]=useState([]);
  const[value,setValue]=useState('');
  const[saving,setSaving]=useState(false);
  const[loading,setLoading]=useState(true);

  const last=history[0]||null;

  useEffect(()=>{
    db.getWeights(50).then(data=>{ setHistory(data); setLoading(false); }).catch(()=>setLoading(false));
  },[]);

  const save=async()=>{
    const v=parseFloat(value);
    if(!v||isNaN(v))return;
    setSaving(true);
    const entry={value:Math.round(v*10)/10, date:new Date().toISOString().slice(0,10), at:new Date().toISOString()};
    await db.saveWeight(entry);
    setHistory(prev=>[entry,...prev].slice(0,50));
    setValue('');
    setSaving(false);
    window.dispatchEvent(new CustomEvent('nutryx:data-changed'));
  };

  return(
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',gap:8}}>
        {[['weight',`⚖️ ${L('weight_tab')}`],['measurements',`📏 ${L('measurements_tab')}`]].map(([v,l])=>(
          <button key={v} onClick={()=>setTab(v)}
            style={{flex:1,padding:'10px',background:tab===v?T.accent:T.surfaceHigh,color:tab===v?'#080d14':T.textMuted,
              border:`1px solid ${tab===v?T.accent:T.border}`,borderRadius:12,fontWeight:700,cursor:'pointer',fontSize:13}}>
            {l}
          </button>
        ))}
      </div>

      {tab==='weight'&&<>
        <Card>
          <SectionLabel>{L('weight')}</SectionLabel>
          <div style={{color:T.textMuted,marginBottom:12}}>
            {loading?'Loading…':last?`Last: ${last.value} kg — ${new Date(last.at).toLocaleDateString()}`:L('no_entries')}
          </div>
          <div style={{display:'flex',gap:8}}>
            <Input value={value} onChange={e=>setValue(e.target.value)} placeholder="kg" type="number" style={{width:120}}/>
            <Btn onClick={save} disabled={saving||!value}>{saving?L('saving'):L('save')}</Btn>
          </div>
        </Card>

        {history.length>=2&&(
          <Card>
            <SectionLabel>{L('progress_chart')}</SectionLabel>
            <WeightChart history={history}/>
          </Card>
        )}

        <Card>
          <SectionLabel>{L('history')}</SectionLabel>
          {loading&&<div style={{color:T.textMuted}}>Loading…</div>}
          {!loading&&history.length===0&&<div style={{color:T.textMuted}}>{L('no_entries')}</div>}
          {history.slice(0,10).map((e,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:i<Math.min(history.length,10)-1?`1px dashed ${T.border}`:'none'}}>
              <span style={{fontWeight:700,color:T.text}}>{e.value} kg</span>
              <span style={{color:T.textMuted,fontSize:13}}>{new Date(e.at).toLocaleDateString()}</span>
            </div>
          ))}
        </Card>
      </>}

      {tab==='measurements'&&<BodyMeasurements/>}
    </div>
  );
}

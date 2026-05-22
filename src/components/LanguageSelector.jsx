import React, { useState, useEffect } from 'react';
import { LANGS, setLang } from '../lib/i18n.js';
import { T } from '../lib/ui.jsx';

export default function LanguageSelector({ style }){
  const current = localStorage.getItem('nutryx:lang') || 'en';
  const [lang, setLangState] = useState(current);
  useEffect(()=>{
    const handler = ()=> setLangState(localStorage.getItem('nutryx:lang')||'en');
    window.addEventListener('nutryx:lang-changed', handler);
    return ()=> window.removeEventListener('nutryx:lang-changed', handler);
  },[]);
  const onChange = (e)=>{ setLang(e.target.value); };
  return (
    <div style={{display:'inline-flex',alignItems:'center',gap:8,...(style||{})}}>
      <select value={lang} onChange={onChange} aria-label="Language" style={{background:'transparent',border:'1px solid '+T.border,color:T.text,padding:'6px 10px',borderRadius:8,fontWeight:700}}>
        {Object.keys(LANGS).map(code=>{
          const info = LANGS[code]||{};
          return <option key={code} value={code}>{(info.flag?info.flag+' ':'') + (info.name||code)}</option>;
        })}
      </select>
    </div>
  );
}

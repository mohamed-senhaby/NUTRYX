import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { translateStatic } from './lib/i18n.js';
import { applyTheme, getCurrentSchedule } from './lib/ui.jsx';

applyTheme();

const root = createRoot(document.getElementById('root'));
root.render(<App />);

setTimeout(()=>{ try{ translateStatic(); }catch(e){} }, 50);
setTimeout(()=>{
  try{
    const splash=document.getElementById('splash');
    if(splash){ splash.classList.add('hidden'); setTimeout(()=>{ try{ splash.remove(); }catch(e){} },500); }
  }catch(e){}
},800);

if(import.meta.env&&import.meta.env.PROD&&'serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/sw.js').then(reg=>{
      try{ if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'}); }catch(e){}
      reg.addEventListener('updatefound',()=>{
        const nw=reg.installing; if(!nw)return;
        nw.addEventListener('statechange',()=>{ if(nw.state==='installed'&&navigator.serviceWorker.controller)console.log('New SW ready.'); });
      });
    }).catch(e=>console.warn('SW failed',e));
  });
}

// Re-render on language or theme change
const rerender=()=>{ try{ applyTheme(); translateStatic(); root.render(<App/>); }catch(e){} };
window.addEventListener('nutryx:lang-changed', rerender);
window.addEventListener('nutryx:theme-changed', rerender);

// Auto-theme: re-apply every 30 min and watch system preference
if(typeof window!=='undefined'){
  setInterval(()=>{ if(getCurrentSchedule()!=='manual'){ applyTheme(); root.render(<App/>); } }, 1800000);
  try{
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{
      if(getCurrentSchedule()==='system'){ applyTheme(); root.render(<App/>); }
    });
  }catch(e){}
}

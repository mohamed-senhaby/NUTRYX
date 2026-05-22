import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { translateStatic } from './lib/i18n.js';

const root = createRoot(document.getElementById('root'));
root.render(<App />);

// Small delay to let React mount before updating static DOM
setTimeout(()=>{ try{ translateStatic(); }catch(e){ console.warn('translateStatic failed', e); } }, 50);

// Register service worker (optional)
if('serviceWorker' in navigator){
	window.addEventListener('load', ()=>{
		navigator.serviceWorker.register('/sw.js').then(()=>console.log('Service worker registered')).catch(e=>console.warn('SW register failed',e));
	});
}

// Re-translate static DOM and re-render React when language changes
window.addEventListener('nutryx:lang-changed', ()=>{
  try{ translateStatic(); root.render(<App />); }catch(e){ console.warn('language change update failed', e); }
});

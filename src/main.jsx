import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { translateStatic } from './lib/i18n.js';

const root = createRoot(document.getElementById('root'));
root.render(<App />);

// Small delay to let React mount before updating static DOM
setTimeout(()=>{ try{ translateStatic(); }catch(e){ console.warn('translateStatic failed', e); } }, 50);

// Register service worker (optional) with update handling
if('serviceWorker' in navigator){
	window.addEventListener('load', ()=>{
		navigator.serviceWorker.register('/sw.js').then(reg=>{
			console.log('Service worker registered', reg);
			try{
				// If there's an active waiting worker, ask it to skip waiting so update applies
				if(reg.waiting) reg.waiting.postMessage({type: 'SKIP_WAITING'});
			}catch(e){/* ignore */}

			reg.addEventListener('updatefound', ()=>{
				const nw = reg.installing;
				if(!nw) return;
				nw.addEventListener('statechange', ()=>{
					if(nw.state === 'installed' && navigator.serviceWorker.controller){
						// New content available — you could show a toast to the user here
						console.log('New service worker installed. Reload to apply updates.');
					}
				});
			});
		}).catch(e=>console.warn('SW register failed', e));
	});
}

// Re-translate static DOM and re-render React when language changes
window.addEventListener('nutryx:lang-changed', ()=>{
  try{ translateStatic(); root.render(<App />); }catch(e){ console.warn('language change update failed', e); }
});

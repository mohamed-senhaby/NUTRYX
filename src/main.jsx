import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { translateStatic } from './lib/i18n.js';

const root = createRoot(document.getElementById('root'));
root.render(<App />);

// Small delay to let React mount before updating static DOM
setTimeout(()=>{ try{ translateStatic(); }catch(e){ console.warn('translateStatic failed', e); } }, 50);

// Remove the static splash screen (present in the static HTML) after mount
setTimeout(()=>{
	try{
		const splash = document.getElementById('splash');
		if(splash){
			splash.classList.add('hidden');
			setTimeout(()=>{ try{ splash.remove(); }catch(e){} }, 500);
		}
	}catch(e){/* ignore */}
}, 800);

// Register service worker (only in production) with update handling
if (import.meta.env && import.meta.env.PROD && 'serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/sw.js').then(reg => {
			console.log('Service worker registered', reg);
			try {
				if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
			} catch (e) { /* ignore */ }

			reg.addEventListener('updatefound', () => {
				const nw = reg.installing;
				if (!nw) return;
				nw.addEventListener('statechange', () => {
					if (nw.state === 'installed' && navigator.serviceWorker.controller) {
						console.log('New service worker installed. Reload to apply updates.');
					}
				});
			});
		}).catch(e => console.warn('SW register failed', e));
	});
}

// Re-translate static DOM and re-render React when language changes
window.addEventListener('nutryx:lang-changed', ()=>{
  try{ translateStatic(); root.render(<App />); }catch(e){ console.warn('language change update failed', e); }
});

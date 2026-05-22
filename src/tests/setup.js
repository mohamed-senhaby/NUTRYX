import '@testing-library/jest-dom';

// Basic jsdom/window polyfills or global setup can go here
// e.g. set global.fetch if needed by tests
if(!globalThis.fetch){
  globalThis.fetch = () => Promise.resolve({ ok:true, json: async ()=>({}) });
}

// Provide a simple in-memory localStorage for the test environment if missing
if(typeof globalThis.localStorage === 'undefined'){
  let _store = {};
  globalThis.localStorage = {
    getItem: (k)=> (_store.hasOwnProperty(k) ? _store[k] : null),
    setItem: (k,v)=> { _store[k] = String(v); },
    removeItem: (k)=> { delete _store[k]; },
    clear: ()=> { _store = {}; }
  };
}

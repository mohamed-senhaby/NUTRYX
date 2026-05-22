export const TODAY = new Date().toISOString().slice(0,10);

export const store = {
  get(k){try{const v=localStorage.getItem(`nutryx:${k}`);return v?JSON.parse(v):null;}catch{return null;}},
  set(k,v){try{localStorage.setItem(`nutryx:${k}`,JSON.stringify(v));}catch{}},
  del(k){try{localStorage.removeItem(`nutryx:${k}`);}catch{}},
};

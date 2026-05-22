// Lightweight Dexie wrapper with graceful fallback for tests/non-browser
const isBrowser = (typeof window !== 'undefined') && ('indexedDB' in window);

const dbObj = {
  _db: null,
  async init(){
    if (this._db) return;
    if (isBrowser){
      try{
        const DexieMod = (await import('dexie')).default || (await import('dexie'));
        const Dexie = DexieMod;
        this._db = new Dexie('NutryxDB');
        this._db.version(1).stores({ meals: '++id,date,name,cal', prefs: 'key', backups: '++id,createdAt' });
        await this._db.open();
        return;
      }catch(e){
        console.warn('Dexie init failed, falling back to memory DB', e);
      }
    }
    // fallback in-memory DB (tests / node env)
    this._db = this._makeMemoryDB();
  },
  _makeMemoryDB(){
    return {
      mealsData: [],
      async toArray(){ return this.mealsData; },
      async clear(){ this.mealsData = []; },
      async bulkAdd(arr){ this.mealsData = arr.slice(); }
    };
  },
  async getMeals(){
    await this.init();
    try{
      if (isBrowser && this._db && this._db.meals) return await this._db.meals.toArray();
      if (this._db && this._db.mealsData !== undefined) return this._db.mealsData;
    }catch(e){ console.warn('getMeals failed', e); }
    return [];
  },
  async saveMeals(meals){
    await this.init();
    try{
      if (isBrowser && this._db && this._db.meals){
        await this._db.transaction('rw', this._db.meals, async ()=>{
          await this._db.meals.clear();
          const payload = (meals||[]).map(m=>{ const c = {...m}; delete c.id; return c; });
          if (payload.length) await this._db.meals.bulkAdd(payload);
        });
        return;
      }
      if (this._db) this._db.mealsData = (meals||[]).slice();
    }catch(e){ console.warn('saveMeals failed', e); }
  },
  async migrateFromLocalStorage(){
    if (!isBrowser) return;
    try{
      const existing = await this.getMeals();
      if (existing && existing.length) return; // DB already has data
      const raw = localStorage.getItem('nutryx:meals');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length===0) return;
      await this.saveMeals(parsed);
      // keep localStorage as fallback for a while; don't auto-delete
    }catch(e){ console.warn('migrateFromLocalStorage failed', e); }
  },
  async exportJSON(){
    const meals = await this.getMeals();
    const prefs = {};
    try{
      if (isBrowser && this._db && this._db.prefs){
        const all = await this._db.prefs.toArray();
        all.forEach(i=>{ prefs[i.key]=i.value; });
      } else {
        for (let i=0;i<localStorage.length;i++){
          const k = localStorage.key(i);
          if (k && k.startsWith('nutryx:')){
            try{ prefs[k.replace(/^nutryx:/,'')] = JSON.parse(localStorage.getItem(k)); }catch(e){}
          }
        }
      }
    }catch(e){}
    return { meals, prefs, exportedAt: new Date().toISOString() };
  },
  async importJSON(obj){
    if (!obj) return;
    if (Array.isArray(obj.meals)) await this.saveMeals(obj.meals);
    if (obj.prefs){
      try{
        if (isBrowser && this._db && this._db.prefs){
          await this._db.transaction('rw', this._db.prefs, async ()=>{
            await this._db.prefs.clear();
            const entries = Object.entries(obj.prefs).map(([key,value])=>({key,value}));
            if (entries.length) await this._db.prefs.bulkAdd(entries);
          });
        } else {
          for (const [k,v] of Object.entries(obj.prefs)){
            try{ localStorage.setItem('nutryx:'+k, JSON.stringify(v)); }catch(e){}
          }
        }
      }catch(e){ console.warn('importJSON prefs failed', e); }
    }
  }
};

export default dbObj;

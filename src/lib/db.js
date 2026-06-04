const isBrowser = typeof window !== 'undefined' && 'indexedDB' in window;

const dbObj = {
  _db: null,

  async init(){
    if (this._db) return;
    if (isBrowser){
      try{
        const Dexie = (await import('dexie')).default;
        this._db = new Dexie('NutryxDB');

        // v1 — original meals-only schema (never change this)
        this._db.version(1).stores({
          meals:   '++id,date,name,cal',
          prefs:   'key',
          backups: '++id,createdAt',
        });

        // v2 — full progress database
        this._db.version(2).stores({
          meals:        '++id,date,type,name,cal',
          prefs:        'key',
          backups:      '++id,createdAt',
          weights:      '++id,date',
          workouts:     '++id,at',
          water:        '++id,date',
          moods:        '++id,date',
          measurements: '++id,at',
        });

        await this._db.open();
        return;
      }catch(e){ console.warn('Dexie init failed, using memory DB', e); }
    }
    this._db = this._makeMemDB();
  },

  _makeMemDB(){
    const makeTable = () => {
      const _data = [];
      return {
        toArray:   async ()=>_data.slice(),
        clear:     async ()=>{ _data.length=0; },
        bulkAdd:   async (arr)=>{ _data.push(...arr); },
        add:       async (item)=>{ const id=Date.now(); _data.unshift({...item,id}); return id; },
        count:     async ()=>_data.length,
        update:    async ()=>{},
        orderBy:   ()=>({ reverse:()=>({ limit:(n)=>({ toArray:async()=>_data.slice(0,n) }) }) }),
        where:     ()=>({ equals:()=>({ first:async()=>null }), aboveOrEqual:()=>({ toArray:async()=>[] }) }),
      };
    };
    return {
      meals:makeTable(), prefs:makeTable(), backups:makeTable(),
      weights:makeTable(), workouts:makeTable(), water:makeTable(),
      moods:makeTable(), measurements:makeTable(),
      transaction: (_mode, _tables, fn) => fn(),
    };
  },

  // ── Meals (backward-compat) ────────────────────────────────────────────────
  async getMeals(){
    await this.init();
    try{
      if (isBrowser && this._db?.meals) return await this._db.meals.toArray();
    }catch(e){ console.warn('getMeals', e); }
    return [];
  },
  async saveMeals(meals){
    await this.init();
    try{
      if (isBrowser && this._db?.meals){
        await this._db.transaction('rw', this._db.meals, async()=>{
          await this._db.meals.clear();
          const payload = (meals||[]).map(m=>{ const c={...m}; delete c.id; return c; });
          if (payload.length) await this._db.meals.bulkAdd(payload);
        });
      }
    }catch(e){ console.warn('saveMeals', e); }
  },

  // ── Weights ────────────────────────────────────────────────────────────────
  async saveWeight(entry){
    await this.init();
    try{ return await this._db.weights.add(entry); }catch(e){ console.warn('saveWeight', e); }
  },
  async getWeights(limit=100){
    await this.init();
    try{ return await this._db.weights.orderBy('date').reverse().limit(limit).toArray(); }
    catch(e){ return []; }
  },

  // ── Workouts ───────────────────────────────────────────────────────────────
  async saveWorkout(entry){
    await this.init();
    try{ return await this._db.workouts.add(entry); }catch(e){ console.warn('saveWorkout', e); }
  },
  async getWorkouts(limit=100){
    await this.init();
    try{ return await this._db.workouts.orderBy('at').reverse().limit(limit).toArray(); }
    catch(e){ return []; }
  },

  // ── Water ──────────────────────────────────────────────────────────────────
  async saveWater(date, amount){
    await this.init();
    try{
      const existing = await this._db.water.where('date').equals(date).first();
      if (existing) await this._db.water.update(existing.id, {amount});
      else await this._db.water.add({date, amount, at: new Date().toISOString()});
    }catch(e){ console.warn('saveWater', e); }
  },
  async getWaterHistory(days=90){
    await this.init();
    try{
      const since = new Date(Date.now()-days*86400000).toISOString().slice(0,10);
      return await this._db.water.where('date').aboveOrEqual(since).toArray();
    }catch(e){ return []; }
  },

  // ── Moods ──────────────────────────────────────────────────────────────────
  async saveMood(entry){
    await this.init();
    try{
      const existing = await this._db.moods.where('date').equals(entry.date).first();
      if (existing) await this._db.moods.update(existing.id, entry);
      else await this._db.moods.add(entry);
    }catch(e){ console.warn('saveMood', e); }
  },
  async getMoods(limit=90){
    await this.init();
    try{ return await this._db.moods.orderBy('date').reverse().limit(limit).toArray(); }
    catch(e){ return []; }
  },

  // ── Measurements ───────────────────────────────────────────────────────────
  async saveMeasurement(entry){
    await this.init();
    try{ return await this._db.measurements.add(entry); }catch(e){ console.warn('saveMeasurement', e); }
  },
  async getMeasurements(limit=100){
    await this.init();
    try{ return await this._db.measurements.orderBy('at').reverse().limit(limit).toArray(); }
    catch(e){ return []; }
  },

  // ── Migration from localStorage ────────────────────────────────────────────
  async migrateFromLocalStorage(){
    if (!isBrowser) return;
    // Meals
    try{
      const d = new Date().toISOString().slice(0,10);
      const existing = await this.getMeals();
      if (!existing?.length){
        const raw = localStorage.getItem('nutryx:meals');
        if (raw){ const p=JSON.parse(raw); if(Array.isArray(p)&&p.length) await this.saveMeals(p); }
      }
    }catch(e){}
    // Weights
    try{
      const wc = await this._db.weights.count();
      if (!wc){
        const hist = JSON.parse(localStorage.getItem('nutryx:weight:history')||'[]');
        if (hist.length) await this._db.weights.bulkAdd(
          hist.map(e=>({value:e.value,date:(e.at||'').slice(0,10),at:e.at||new Date().toISOString()}))
        );
      }
    }catch(e){}
    // Workouts
    try{
      const wc = await this._db.workouts.count();
      if (!wc){
        const entries = JSON.parse(localStorage.getItem('nutryx:workout:entries')||'[]');
        if (entries.length) await this._db.workouts.bulkAdd(entries);
      }
    }catch(e){}
    // Water
    try{
      const wc = await this._db.water.count();
      if (!wc){
        const hist = JSON.parse(localStorage.getItem('nutryx:water:history')||'{}');
        const entries = Object.entries(hist).map(([date,amount])=>({date,amount,at:new Date(date+'T12:00:00').toISOString()}));
        if (entries.length) await this._db.water.bulkAdd(entries);
      }
    }catch(e){}
    // Moods
    try{
      const wc = await this._db.moods.count();
      if (!wc){
        const hist = JSON.parse(localStorage.getItem('nutryx:mood:history')||'[]');
        if (hist.length) await this._db.moods.bulkAdd(hist);
      }
    }catch(e){}
    // Measurements
    try{
      const wc = await this._db.measurements.count();
      if (!wc){
        const hist = JSON.parse(localStorage.getItem('nutryx:measurements:history')||'[]');
        if (hist.length) await this._db.measurements.bulkAdd(hist);
      }
    }catch(e){}
  },

  // ── Export / Import (full backup) ──────────────────────────────────────────
  async exportJSON(){
    const [meals, weights, workouts, waterRaw, moods, measurements] = await Promise.all([
      this.getMeals(), this.getWeights(), this.getWorkouts(),
      this.getWaterHistory(), this.getMoods(), this.getMeasurements(),
    ]);
    const water = Object.fromEntries(waterRaw.map(e=>[e.date,e.amount]));
    const prefs = {};
    try{
      if(isBrowser){
        for(let i=0;i<localStorage.length;i++){
          const k=localStorage.key(i);
          if(k?.startsWith('nutryx:')){ try{ prefs[k.replace(/^nutryx:/,'')]=JSON.parse(localStorage.getItem(k)); }catch{} }
        }
      }
    }catch{}
    return { meals, weights, workouts, water, moods, measurements, prefs, exportedAt: new Date().toISOString() };
  },

  async importJSON(obj){
    if (!obj) return;
    if (Array.isArray(obj.meals))        await this.saveMeals(obj.meals);
    if (Array.isArray(obj.weights)&&obj.weights.length){ await this._db?.weights?.clear(); await this._db?.weights?.bulkAdd(obj.weights); }
    if (Array.isArray(obj.workouts)&&obj.workouts.length){ await this._db?.workouts?.clear(); await this._db?.workouts?.bulkAdd(obj.workouts); }
    if (Array.isArray(obj.moods)&&obj.moods.length){ await this._db?.moods?.clear(); await this._db?.moods?.bulkAdd(obj.moods); }
    if (Array.isArray(obj.measurements)&&obj.measurements.length){ await this._db?.measurements?.clear(); await this._db?.measurements?.bulkAdd(obj.measurements); }
    if (obj.water && typeof obj.water==='object'){
      await this._db?.water?.clear();
      const entries = Object.entries(obj.water).map(([date,amount])=>({date,amount,at:new Date(date+'T12:00:00').toISOString()}));
      if (entries.length) await this._db?.water?.bulkAdd(entries);
    }
    if (obj.prefs){
      try{
        for(const [k,v] of Object.entries(obj.prefs)){
          try{ localStorage.setItem('nutryx:'+k, JSON.stringify(v)); }catch{}
        }
      }catch(e){}
    }
  },

  // ── Stats ──────────────────────────────────────────────────────────────────
  async getStats(){
    await this.init();
    const [meals, weights, workouts, moods] = await Promise.all([
      this.getMeals(), this.getWeights(), this.getWorkouts(), this.getMoods()
    ]);
    const days = new Set(meals.map(m=>m.date).filter(Boolean)).size;
    const totalCal = meals.reduce((s,m)=>s+(m.cal||0),0);
    return { mealCount: meals.length, days, totalCal, weightEntries: weights.length, workoutCount: workouts.length, moodDays: moods.length };
  },
};

export default dbObj;

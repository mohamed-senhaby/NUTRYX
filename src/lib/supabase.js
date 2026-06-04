import { store } from './store.js';

let client = null;
let _subscription = null;

function _getConfig(){
  const saved = store.get('supabase') || {};
  const url = import.meta.env.VITE_SUPABASE_URL || saved.url || null;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || saved.key || null;
  return { url, key };
}

export async function initSupabase(){
  if (client) return client;
  const { url, key } = _getConfig();
  if (!url || !key) return null;
  try{
    const mod = await import('@supabase/supabase-js');
    const createClient = mod.createClient || (mod.default && mod.default.createClient) || mod.default;
    client = createClient(url, key);
    return client;
  }catch(e){
    console.warn('supabase init failed', e);
    return null;
  }
}

export function setConfig(url, key){
  store.set('supabase', { url, key });
}

export async function signInMagic(email){
  const s = await initSupabase();
  if (!s) throw new Error('Supabase not configured');
  return s.auth.signInWithOtp({ email });
}

export async function signUpWithPassword(email, password){
  const s = await initSupabase();
  if (!s) throw new Error('Supabase not configured');
  return s.auth.signUp({ email, password });
}

export async function signInWithPassword(email, password){
  const s = await initSupabase();
  if (!s) throw new Error('Supabase not configured');
  return s.auth.signInWithPassword({ email, password });
}

export async function signOut(){
  const s = await initSupabase();
  if (!s) return;
  return s.auth.signOut();
}

export async function getUser(){
  const s = await initSupabase();
  if (!s) return null;
  try{
    const res = await s.auth.getUser();
    return res?.data?.user || null;
  }catch(e){
    return null;
  }
}

export function onAuthStateChange(cb){
  // returns unsubscribe function
  (async ()=>{
    const s = await initSupabase();
    if (!s) return ()=>{};
    try{
      const { data } = s.auth.onAuthStateChange((event, session) => {
        cb(event, session);
      });
      _subscription = data?.subscription || null;
    }catch(e){/* ignore */}
  })();

  return ()=>{ try{ if (_subscription && _subscription.unsubscribe) _subscription.unsubscribe(); }catch(e){} };
}

export async function uploadBackup(payload){
  const s = await initSupabase();
  if (!s) throw new Error('Supabase not configured');
  const user = await getUser();
  if (!user) throw new Error('Not signed in');
  // expects a table `nutryx_backups` with columns: id (uuid), user_id (uuid), payload (jsonb), created_at (timestamptz)
  const { data, error } = await s.from('nutryx_backups').insert([{ user_id: user.id, payload }]);
  return { data, error };
}

export async function fetchLatestBackup(){
  const s = await initSupabase();
  if (!s) throw new Error('Supabase not configured');
  const user = await getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await s.from('nutryx_backups').select('payload, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return { data, error };
}

export async function saveRecipe(recipe){
  const s = await initSupabase();
  if (!s) throw new Error('Supabase not configured');
  const user = await getUser();
  if (!user) throw new Error('Not signed in');
  const row = {
    user_id: user.id,
    created_by_name: user.email?.split('@')[0] || 'User',
    name: recipe.name,
    ingredients: recipe.ingredients,
    per100g: recipe.per100g,
    total_weight: recipe.totalWeight || 0,
    is_public: true,
  };
  if (recipe.supabaseId) {
    const { data, error } = await s.from('nutryx_recipes').update(row).eq('id', recipe.supabaseId).eq('user_id', user.id).select().maybeSingle();
    return { data, error };
  }
  const { data, error } = await s.from('nutryx_recipes').insert([row]).select().maybeSingle();
  return { data, error };
}

export async function fetchRecipeById(id){
  const s = await initSupabase();
  if (!s) throw new Error('Supabase not configured');
  const { data, error } = await s.from('nutryx_recipes').select('*').eq('id', id).maybeSingle();
  return { data, error };
}

export async function deleteSharedRecipe(supabaseId){
  const s = await initSupabase();
  if (!s) return;
  const user = await getUser();
  if (!user) return;
  await s.from('nutryx_recipes').delete().eq('id', supabaseId).eq('user_id', user.id);
}

export default {
  initSupabase, setConfig, signInMagic, signOut, getUser, onAuthStateChange,
  uploadBackup, fetchLatestBackup, saveRecipe, fetchRecipeById, deleteSharedRecipe
};

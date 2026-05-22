import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../store';

beforeEach(()=>{ localStorage.clear(); });

describe('store wrapper', ()=>{
  it('set/get/del works', ()=>{
    expect(store.get('x')).toBe(null);
    store.set('x',{a:1});
    expect(store.get('x')).toEqual({a:1});
    store.del('x');
    expect(store.get('x')).toBe(null);
  });
});

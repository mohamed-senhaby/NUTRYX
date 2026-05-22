import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../api';

beforeEach(()=>{ global.fetch = vi.fn(); });

describe('api wrappers', ()=>{
  it('ai posts to /api/ai and returns cleaned text', async ()=>{
    const sample = { text: '```json\n{"ok":true}\n```' };
    global.fetch.mockResolvedValueOnce({ ok:true, json: async ()=>sample });
    const out = await api.ai('hello');
    expect(out).toBe('{"ok":true}');
    expect(global.fetch).toHaveBeenCalledWith('/api/ai', expect.objectContaining({ method: 'POST' }));
  });

  it('searchUSDA posts to /api/usda/search and maps results', async ()=>{
    const food = { description: 'Oatmeal', fdcId: 123, servingSize:100, servingSizeUnit:'g', foodNutrients: [{nutrientId:1008,value:52}] };
    global.fetch.mockResolvedValueOnce({ ok:true, json: async ()=>({ foods:[food] }) });
    const res = await api.searchUSDA('oat');
    expect(res.length).toBeGreaterThanOrEqual(1);
    expect(res[0].name).toContain('Oatmeal');
  });

  it('lookupBarcode returns cached value when present', async ()=>{
    // seed store directly
    const cached = { found:true, name:'Test', barcode:'000' };
    // use store in api module via import
    const { store } = await import('../store');
    store.set('food:bc:000', cached);
    const prod = await api.lookupBarcode('000');
    expect(prod.found).toBe(true);
    expect(prod.source).toBe('local-db');
  });
});

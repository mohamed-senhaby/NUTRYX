import { describe, it, expect, beforeEach } from 'vitest';
import { L, setLang, isRTL, getLangFlag, translateStatic, LANGS } from '../i18n';

beforeEach(()=>{
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('i18n module', ()=>{
  it('L returns English tagline by default', ()=>{
    expect(L('tagline')).toBe(LANGS.en.tagline);
  });

  it('setLang stores language and helpers reflect it', ()=>{
    const evs = [];
    window.addEventListener('nutryx:lang-changed', (e)=> evs.push(e.detail));
    setLang('en');
    expect(localStorage.getItem('nutryx:lang')).toBe('en');
    expect(isRTL()).toBe(false);
    expect(getLangFlag()).toBe(LANGS.en.flag);
  });

  it('translateStatic updates elements with data-i18n and data-i18n-html', ()=>{
    document.body.innerHTML = '<div data-i18n="tagline"></div><div data-i18n-html="iosHintHTML"></div>';
    translateStatic();
    expect(document.querySelector('[data-i18n]').textContent).toBe(LANGS.en.tagline);
    expect(document.querySelector('[data-i18n-html]').innerHTML).toContain('Share');
  });
});

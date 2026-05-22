export const LANGS = {
  en: {
    flag:"🇬🇧", name:"English", dir:"ltr",
    tagline:"Your AI Health Coach",
    installTitle:"Install NUTRYX",
    installSub:"Add to home screen for the full app experience",
    installBtn:"Install",
    iosHintHTML:"📲 Tap <b>Share</b> then <b>\"Add to Home Screen\"</b> to install NUTRYX",
    gotIt:"Got it",
    welcome:"Welcome! 👋",
    onboarding_sub:"Let's personalize NUTRYX for you. Takes 30 seconds.",
    continueBtn:"Continue →",
    calculateBtn:"Calculate →",
    startApp:"🚀 Start NUTRYX",
    yourGoal:"Your goal 🎯",
    activityLevel:"Activity level 🏃",
    yourGoals:"Your goals ✨",
    tour_step1_title:"Home Dashboard",
    tour_step1_desc:"Your daily overview.",
    tour_step2_title:"Nutrition Tab",
    tour_step2_desc:"Log everything you eat.",
    tour_step3_title:"Barcode Scanner",
    tour_step3_desc:"Point your camera at any food barcode.",
    tour_step4_title:"Photo Scan",
    tour_step4_desc:"Take a photo of the front of the package.",
    tour_step5_title:"Workout Tab",
    tour_step5_desc:"Describe your goal and AI generates a plan.",
    tour_step6_title:"Water Tab",
    tour_step6_desc:"Track water",
    tour_step7_title:"Weight Tab",
    tour_step7_desc:"Log your weight daily.",
    tour_step8_title:"Achievements",
    tour_step8_desc:"Earn badges.",
    barcodeHint:"Point camera at barcode",
    home:"Home", food:"Food", workout:"Workout", water:"Water", weight:"Weight",
    today:"Today", kcal:"kcal",
    tourSkip:"Skip tour", tourNext:"Next →", tourBack:"← Back", tourStart:"Let's go! 🚀",
  }
};

export function L(key){ const lang=localStorage.getItem("nutryx:lang")||"en"; return(LANGS[lang]||LANGS.en)[key]||(LANGS.en)[key]||key; }
export function isRTL(){ return (LANGS[localStorage.getItem("nutryx:lang")||"en"]||LANGS.en).dir==="rtl"; }
export function getLangFlag(){ return (LANGS[localStorage.getItem("nutryx:lang")||"en"]||LANGS.en).flag; }

export function setLang(lang){
  localStorage.setItem('nutryx:lang', lang);
  try{ window.dispatchEvent(new CustomEvent('nutryx:lang-changed', { detail: lang })); }catch(e){}
}

export function translateStatic(){
  try{
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const k = el.getAttribute('data-i18n');
      if(k){ const v = L(k); if(v!==undefined) el.textContent = v; }
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el=>{
      const k = el.getAttribute('data-i18n-html');
      if(k){ const v = L(k); if(v!==undefined) el.innerHTML = v; }
    });
    const ib = document.getElementById('install-btn');
    if(ib && ib.getAttribute('data-i18n')){
      const v = L(ib.getAttribute('data-i18n'));
      if(v!==undefined){ ib.textContent = v; ib.setAttribute('aria-label', v); }
    }
  }catch(e){console.warn('translateStatic failed',e);}  
}

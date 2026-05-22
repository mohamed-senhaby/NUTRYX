import React, { useRef, useState } from 'react';
import { Card, SectionLabel, T } from '../lib/ui.jsx';
import db from '../lib/db.js';

export default function BackupCard(){
  const fileRef = useRef(null);
  const [busy,setBusy] = useState(false);

  const handleExport = async ()=>{
    setBusy(true);
    try{
      const data = await db.exportJSON();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutryx-backup-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }catch(e){
      console.warn('Export failed', e);
      alert('Export failed');
    }finally{ setBusy(false); }
  };

  const handleImportClick = ()=>{ fileRef.current && fileRef.current.click(); };

  const handleFile = async (ev)=>{
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    setBusy(true);
    try{
      const txt = await f.text();
      const obj = JSON.parse(txt);
      await db.importJSON(obj);
      // notify app to refresh in-memory state
      try{ window.dispatchEvent(new CustomEvent('nutryx:imported')); }catch(e){}
      alert('Import complete');
    }catch(e){ console.warn('Import failed', e); alert('Import failed: invalid file'); }
    finally{ setBusy(false); ev.target.value = ''; }
  };

  return (
    <Card>
      <SectionLabel>Backup & Restore</SectionLabel>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <div style={{color:T.textMuted,fontSize:13}}>Export a JSON backup of your data (meals & prefs).</div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={handleExport} disabled={busy} style={{background:'#3b82f6',border:'none',color:'#080d14',padding:'8px 12px',borderRadius:8,fontWeight:700}}>Export</button>
          <button onClick={handleImportClick} disabled={busy} style={{background:'transparent',border:'1px solid #3b82f6',color:'#3b82f6',padding:'8px 12px',borderRadius:8}}>Import</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json" style={{display:'none'}} onChange={handleFile} />
      </div>
    </Card>
  );
}

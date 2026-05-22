import React from 'react';
import { Card, SectionLabel, T } from '../lib/ui.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import { L } from '../lib/i18n.js';

export default function Settings(){
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <Card>
        <SectionLabel>{L('settings')||'Settings'}</SectionLabel>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{color:T.textMuted}}>App language</div>
          <LanguageSelector />
        </div>
      </Card>
      <Card>
        <SectionLabel>Privacy</SectionLabel>
        <div style={{color:T.textMuted}}>Keys are stored on the server side and never in the client.</div>
      </Card>
    </div>
  );
}

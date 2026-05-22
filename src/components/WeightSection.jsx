import React from 'react';
import { Card, SectionLabel, T } from '../lib/ui.jsx';
import { L } from '../lib/i18n.js';
import { store } from '../lib/store.js';

export default function WeightSection(){
  const last = store.get('weight:last')||null;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <Card>
        <SectionLabel>{L('weight') || 'Weight'}</SectionLabel>
        <div style={{color:T.textMuted}}>{last?`Last: ${last.value} kg on ${new Date(last.at).toLocaleDateString()}`:'No weight entries yet.'}</div>
      </Card>
    </div>
  );
}

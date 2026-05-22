import React from 'react';
import { Card, SectionLabel, T } from '../lib/ui.jsx';
import { L } from '../lib/i18n.js';

export default function WorkoutSection(){
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <Card>
        <SectionLabel>{L('workout') || 'Workout'}</SectionLabel>
        <div style={{color:T.textMuted}}>Simple workout tracking will appear here. You can log sessions, durations, and intensity.</div>
      </Card>
    </div>
  );
}

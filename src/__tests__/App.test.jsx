import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, it, expect } from 'vitest';
import App from '../App.jsx';
import { store } from '../lib/store';

beforeEach(()=>{ localStorage.clear(); store.set('profile',{name:'Tester'}); });

describe('App', ()=>{
  it('renders app shell when profile present', ()=>{
    render(<App />);
    expect(screen.getByText('NUTRYX')).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import App from '../App.jsx';
import { store } from '../lib/store.js';

// Mock the client API layer so tests don't hit network
vi.mock('../lib/api.js', () => ({
  searchUSDA: async (q) => [],
  searchOFF: async (q) => ([{
    name: 'Banana',
    brand: 'TestBrand',
    serving: '100 g',
    perServing: { cal: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
    source: 'openfoodfacts'
  }]),
  lookupBarcode: async (bc) => ({ found: false })
}));

beforeEach(()=>{
  localStorage.clear();
  store.set('profile',{ name: 'Tester', calGoal: 2000, proteinGoal: 120 });
});

describe('Integration flow: food, workout, water, weight', ()=>{
  it('adds a food item and updates storage, logs workout, increments water and saves weight', async ()=>{
    render(<App />);

    // Go to Food tab
    fireEvent.click(screen.getByText('Food'));

    // Type search term
    const search = screen.getByPlaceholderText(/Search 300,000\+ foods/i);
    fireEvent.change(search, { target: { value: 'banana' } });

    // Wait for mocked result to appear and click it
    await waitFor(()=>expect(screen.getByText('Banana')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Banana'));

    // Add to log (selected view shows Add to Log)
    await waitFor(()=>expect(screen.getByText(/Add to Log/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Add to Log/i));

    // Verify meal stored
    const meals = JSON.parse(localStorage.getItem('nutryx:meals')||'[]');
    expect(meals.length).toBeGreaterThan(0);
    expect(meals[0].name).toContain('Banana');
    expect(meals[0].cal).toBe(89);

    // Workout: navigate, fill and log
    fireEvent.click(screen.getByText('Workout'));
    const desc = screen.getByPlaceholderText(/e.g. 30 min jog/i);
    const mins = screen.getByPlaceholderText(/mins/i);
    fireEvent.change(desc, { target: { value: '30 min jog' } });
    fireEvent.change(mins, { target: { value: '30' } });
    fireEvent.click(screen.getByText('Log'));
    const workouts = JSON.parse(localStorage.getItem('nutryx:workout:entries')||'[]');
    expect(workouts.length).toBeGreaterThan(0);
    expect(workouts[0].desc).toBe('30 min jog');

    // Water: navigate and +1
    fireEvent.click(screen.getByText('Water'));
    fireEvent.click(screen.getByText('+1'));
    const water = JSON.parse(localStorage.getItem('nutryx:today:water')||'null');
    // stored as number
    expect(localStorage.getItem('nutryx:today:water')).not.toBeNull();

    // Weight: navigate, set and save
    fireEvent.click(screen.getByText('Weight'));
    const kg = screen.getByPlaceholderText('kg');
    fireEvent.change(kg, { target: { value: '72' } });
    // button label can be 'Save' or a localized 'Start NUTRYX' during onboarding/tour
    fireEvent.click(screen.getByText(/Save|Start/i));
    const last = JSON.parse(localStorage.getItem('nutryx:weight:last')||'null');
    expect(last).not.toBeNull();
    expect(last.value).toBeCloseTo(72, 0);
  });
});

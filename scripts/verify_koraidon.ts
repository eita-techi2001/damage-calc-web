
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';

const gen = Generations.get(9);

// Setup Defender: Dummy Target (Mew, 100/100/100 defenses)
// Neutral nature, 0 EVs -> HP: 175, Def: 120
const defender = new Pokemon(gen, 'Mew', {
    level: 50,
    evs: { hp: 0, def: 0 },
    nature: 'Serious'
});

// Setup Koraidon
// Base Atk 135.
// Level 50.
// IV 31, EV 252 (Atk), Nature Adamant (+Atk)
// Atk Stat: floor((135*2 + 31 + 252/4)*0.5 + 5) * 1.1 
// = floor((270 + 31 + 63)*0.5 + 5) * 1.1
// = floor(182 + 5) * 1.1 = floor(187) * 1.1 = 205.
// With Orichalcum Pulse (1.333x): ~273.

// Configuration 1: Koraidon (Passive) - Just Sun, No Ability Flag (Control)
// (Technically Orichalcum sets Sun, but if we assume ability off, just Sun)
const koraidonControl = new Pokemon(gen, 'Koraidon', {
    level: 50,
    nature: 'Adamant',
    evs: { atk: 252 }
});

// Configuration 2: Koraidon (Active) - AbilityOn + Sun
const koraidonActive = new Pokemon(gen, 'Koraidon', {
    level: 50,
    nature: 'Adamant',
    evs: { atk: 252 },
    overrides: { abilityOn: true } // This is how my logic passes it
});

const move = new Move(gen, 'Collision Course');

// Scenario A: Control (No Sun, No Ability Boost)
const resA = calculate(gen, koraidonControl, defender, move);

// Scenario B: Active (Sun + Ability Boost)
// Note: My logic sets weather='Sun' when active.
const fieldSun = new Field({ weather: 'Sun' });
const resB = calculate(gen, koraidonActive, defender, move, fieldSun);

console.log(`A: ${resA.range().join('-')}`);
console.log(`B: ${resB.range().join('-')}`);
console.log(`Ratio: ${resB.range()[0] / resA.range()[0]}`);

// Expected:
// Orichalcum Pulse boosts Atk by ~33%.
// Sun boosts Fire moves (Collision Course is Fighting -> No boost from Sun itself).
// So resB should be ~1.33x resA.
// 205 Atk -> ~273 Eff Atk.


import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';

const gen = Generations.get(9);
const move = new Move(gen, 'Collision Course');

// Defender
const incineroar = new Pokemon(gen, 'Incineroar', {
    level: 50, item: 'Sitrus Berry', nature: 'Bold', evs: { hp: 252, def: 130 }
});
incineroar.stats.hp = 202;
incineroar.stats.def = 130;

// Scenario 1: Koraidon Active (Forced Sun)
const koraidonActive = new Pokemon(gen, 'Koraidon', {
    level: 50, nature: 'Adamant', evs: { atk: 252 },
    // boosts: { atk: -1 } // Ignore intimidate for clarity
});
// Simulate App Logic: App sees "Active" -> Sets Field Sun
const fieldSun = new Field({ weather: 'Sun' });
const resActive = calculate(gen, koraidonActive, incineroar, move, fieldSun);
console.log(`Active (Sun): ${resActive.range().join('-')}`);

// Scenario 2: Koraidon Inactive (No Forced Field)
// Simulate App Logic: App sees "Inactive" -> DOES NOT set Field Sun?
// But does it pass an EMPTY field? Or DEFAULT field?
const fieldEmpty = new Field({}); // No weather
const resInactive = calculate(gen, koraidonActive, incineroar, move, fieldEmpty);
console.log(`Inactive (No Sun): ${resInactive.range().join('-')}`);

// Check if difference exists
const ratio = resActive.range()[0] / resInactive.range()[0];
console.log(`Ratio Active/Inactive: ${ratio.toFixed(2)}`);

if (ratio < 1.1) {
    console.log("WARNING: Active and Inactive seem identical! Inactive might be getting Sun implicitly?");
} else {
    console.log("SUCCESS: Inactive deals significantly less damage.");
}

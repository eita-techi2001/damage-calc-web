
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';

const gen = Generations.get(9);

// Defender: Mew (Neutral)
const defender = new Pokemon(gen, 'Mew', {
    level: 50, evs: { hp: 0, def: 0 }, nature: 'Serious'
});

// Attacker: Koraidon
const koraidon = new Pokemon(gen, 'Koraidon', {
    level: 50, nature: 'Adamant', evs: { atk: 252 }
});

const move = new Move(gen, 'Flare Blitz');

// Case A: Base (No Sun, No Ability Flag) - Should be simple damage
const resA = calculate(gen, koraidon, defender, move);

// Case B: Active (Sun + Ability Flag) simulating my app
// Using "Orichalcum Pulse" on Koraidon.
const koraidonActive = new Pokemon(gen, 'Koraidon', {
    level: 50, nature: 'Adamant', evs: { atk: 252 },
    overrides: { abilityOn: true }
});
const fieldSun = new Field({ weather: 'Sun' });
const resB = calculate(gen, koraidonActive, defender, move, fieldSun);

console.log(`Move: Flare Blitz (Fire, 120 BP)`);
console.log(`A (Base): ${resA.range().join('-')}`);
console.log(`B (Active): ${resB.range().join('-')}`);

const ratio = resB.range()[0] / resA.range()[0];
console.log(`Ratio B/A: ${ratio}`);
console.log(`Expected: 1.5 (Sun) * 1.333 (Ability) = 2.0`);
console.log(`If Double Ability Boost: 1.5 * 1.333 * 1.333 = 2.66`);
// But wait, Koraidon's ability is Orichalcum Pulse.
// If Ability logic adds 1.33. And Sun logic adds 1.5.
// Does Sun ALSO trigger Ability Boost in Calc automatically?
// If so, and we ALSO pass abilityOn, maybe it stacks?

// Let's test Sun ONLY (Case C)
const resC = calculate(gen, koraidon, defender, move, fieldSun); // No abilityOn override
console.log(`C (Sun Only): ${resC.range().join('-')}`);
console.log(`Ratio C/A: ${resC.range()[0] / resA.range()[0]}`);


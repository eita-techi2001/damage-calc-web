
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';

const gen = Generations.get(9);

// Defender: Chien-Pao (Ice/Dark, 4x Weak to Fighting)
const defender = new Pokemon(gen, 'Chien-Pao', {
    level: 50,
    evs: { hp: 0, def: 0 },
    nature: 'Serious'
});

// Attacker: Koraidon
const koraidon = new Pokemon(gen, 'Koraidon', {
    level: 50, nature: 'Adamant', evs: { atk: 252 }
});

const move = new Move(gen, 'Collision Course');

// Case A: No Sun (Base)
const resA = calculate(gen, koraidon, defender, move);

// Case B: Sun (Orichalcum Pulse Active)
// Expect: Atk * 1.333
const fieldSun = new Field({ weather: 'Sun' });
const resB = calculate(gen, koraidon, defender, move, fieldSun);

console.log(`Target: Chien-Pao (4x Weak)`);
console.log(`A (No Sun): ${resA.range().join('-')}`);
console.log(`B (Sun): ${resB.range().join('-')}`);
console.log(`Ratio B/A: ${resB.range()[0] / resA.range()[0]}`);

// Check Collision Course Mechanics
// Compare with Close Combat (120 BP)
// Collision Course (100 BP) -> Effective ~133 BP on SE?
const cc = new Move(gen, 'Close Combat');
const resCC = calculate(gen, koraidon, defender, cc, fieldSun);
console.log(`Close Combat (Sun): ${resCC.range().join('-')}`);
console.log(`Collision Course vs Close Combat Ratio: ${resB.range()[0] / resCC.range()[0]}`);
// If Collision Course is boosting, 100 * 1.333 = 133.33 BP.
// Close Combat is 120 BP.
// Expected Ratio: 133 / 120 = 1.11x.

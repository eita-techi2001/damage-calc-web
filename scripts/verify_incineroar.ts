
import { calculate, Generations, Pokemon, Move } from '@smogon/calc';

const gen = Generations.get(9);

// Defender: Incineroar (User)
const incineroar = new Pokemon(gen, 'Incineroar', {
    level: 50,
    nature: 'Sassy',
    evs: { hp: 252, spd: 252 } // Specially Defensive but testing Phys Bulk
});

// Attacker: Landorus-Therian (Opponent)
// Atk 216 (Adamant 252)
const landorus = new Pokemon(gen, 'Landorus-Therian', {
    level: 50,
    nature: 'Adamant',
    evs: { atk: 252 }
});

const move = new Move(gen, 'Earthquake'); // Spread reduction? SmogonCalc handles standard.

// Scenario A: Intimidate Active (-1 Atk)
const landorusMin1 = new Pokemon(gen, 'Landorus-Therian', {
    level: 50, nature: 'Adamant', evs: { atk: 252 },
    boosts: { atk: -1 }
});

// Scenario B: No Intimidate (0 Atk)
const landorusNeutral = new Pokemon(gen, 'Landorus-Therian', {
    level: 50, nature: 'Adamant', evs: { atk: 252 }
});

const resA = calculate(gen, landorusMin1, incineroar, move, undefined);
const resB = calculate(gen, landorusNeutral, incineroar, move, undefined);

console.log(`A (-1 Atk): ${resA.range().join('-')}`);
console.log(`B (0 Atk): ${resB.range().join('-')}`);
console.log(`Reduction: ${(1 - resA.range()[0] / resB.range()[0]) * 100}%`);

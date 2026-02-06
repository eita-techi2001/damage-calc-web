const { calculate, Generations, Pokemon, Move } = require('@smogon/calc');

const gen = Generations.get(9);
const result = calculate(
    gen,
    new Pokemon(gen, 'Flutter Mane', { evs: { spa: 252 }, nature: 'Modest' }),
    new Pokemon(gen, 'Mew', { evs: { hp: 252, spd: 0 }, nature: 'Bold' }),
    new Move(gen, 'Shadow Ball')
);

const ko = result.kochance();
console.log('KO Chance Output:', JSON.stringify(ko, null, 2));

// Test 2 Hit KO range
const result2 = calculate(
    gen,
    new Pokemon(gen, 'Pikachu', { level: 50, stats: { atk: 50 } }), // Weak
    new Pokemon(gen, 'Mew', { level: 50, stats: { hp: 1000 } }), // Strong
    new Move(gen, 'Nuzzle')
);

// We want a case where it is random 2HKO.
// Let's try to simulate known values.
// Atk 200 vs Def 200. Move 100BP.
// Damage approx 85-100?
// HP 180.
// Min 85. Max 100.
// 2 hits: 170 ~ 200. Random 2HKO.

const p1 = new Pokemon(gen, 'Mew', { level: 50, stats: { atk: 150 } });
const p2 = new Pokemon(gen, 'Mew', { level: 50, stats: { hp: 130, def: 100 } });
const m = new Move(gen, 'Body Slam');

const r3 = calculate(gen, p1, p2, m);
console.log('Range:', r3.range());
console.log('KO:', r3.kochance());

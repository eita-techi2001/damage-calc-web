
const { calculate, Generations, Pokemon, Move } = require('@smogon/calc');

const gen = Generations.get(9);

const baseOptions = {
    level: 50,
    nature: 'Serious',
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
};

// 1. Check Defense
// Pikachu (Electric). Weak to Ground.
// Stellar Tera should RETAIN weakness to Ground.
const defenderBase = new Pokemon(gen, 'Pikachu', { ...baseOptions });
const defenderStellar = new Pokemon(gen, 'Pikachu', { ...baseOptions, teraType: 'Stellar' });
const defenderElectric = new Pokemon(gen, 'Pikachu', { ...baseOptions, teraType: 'Electric' }); // Control

console.log('Base Types:', defenderBase.types);
console.log('Stellar Types:', defenderStellar.types);
console.log('Electric Tera Types:', defenderElectric.types);

const attacker = new Pokemon(gen, 'Garchomp', { ...baseOptions });
const earthquake = new Move(gen, 'Earthquake');

const resBase = calculate(gen, attacker, defenderBase, earthquake);
const resStellar = calculate(gen, attacker, defenderStellar, earthquake);

console.log('Damage vs Base (Element):', resBase.range());
console.log('Damage vs Stellar:', resStellar.range());

// 2. Check Offense
// Pikachu using Thunderbolt.
// Base: STAB (1.5x)
// Stellar: STAB (2.0x theoretically? or 1.2x if not original?)
// Stellar Boost:
// - Original Type (Electric): 1.5x -> 2.0x (Stellar STAB)
// - Non-Original (e.g. Grass Knot): 1.0x -> 1.2x
const pikaStellar = new Pokemon(gen, 'Pikachu', { ...baseOptions, teraType: 'Stellar' });
const pikaBase = new Pokemon(gen, 'Pikachu', { ...baseOptions });

const thunderbolt = new Move(gen, 'Thunderbolt');
const grassKnot = new Move(gen, 'Grass Knot');
const dummyTarget = new Pokemon(gen, 'Mew', { ...baseOptions }); // Neutral target

const dmgTbBase = calculate(gen, pikaBase, dummyTarget, thunderbolt);
const dmgTbStellar = calculate(gen, pikaStellar, dummyTarget, thunderbolt);

const dmgGkBase = calculate(gen, pikaBase, dummyTarget, grassKnot);
const dmgGkStellar = calculate(gen, pikaStellar, dummyTarget, grassKnot);

console.log('Thunderbolt (Base):', dmgTbBase.range());
console.log('Thunderbolt (Stellar):', dmgTbStellar.range());

console.log('Grass Knot (Base):', dmgGkBase.range());
console.log('Grass Knot (Stellar):', dmgGkStellar.range());


import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';

const gen = Generations.get(9);

const d1 = new Pokemon(gen, 'Kyogre', {
    evs: { hp: 252, spd: 4 }
});
const m1 = new Move(gen, 'Moonblast');

function runTest(name: string, p: Pokemon, f: Field = new Field()) {
    const res = calculate(gen, p, d1, m1, f);
    console.log(`${name}: ${res.range().join('-')} (${res.desc()})`);
}

// Case 1: Manual Override
runTest("CASE 1 (Overrides)", new Pokemon(gen, 'Flutter Mane', {
    item: 'Booster Energy',
    nature: 'Modest',
    evs: { spa: 252, spe: 252, hp: 4 },
    overrides: { abilityOn: true, boostedStat: 'spa' }
}));

// Case 2: Auto Booster Item
runTest("CASE 2 (Item Only)", new Pokemon(gen, 'Flutter Mane', {
    item: 'Booster Energy',
    nature: 'Modest',
    evs: { spa: 252, spe: 252, hp: 4 }
}));

// Case 3: Sun
runTest("CASE 3 (Sun)", new Pokemon(gen, 'Flutter Mane', {
    nature: 'Modest',
    evs: { spa: 252, spe: 252, hp: 4 }
}), new Field({ weather: 'Sun' }));

// Case 4: No Boost
runTest("CASE 4 (Control)", new Pokemon(gen, 'Flutter Mane', {
    item: 'Leftovers',
    nature: 'Modest',
    evs: { spa: 252, spe: 252, hp: 4 }
}));

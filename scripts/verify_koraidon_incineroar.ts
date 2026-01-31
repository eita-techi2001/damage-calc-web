
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';

const gen = Generations.get(9);
const move = new Move(gen, 'Collision Course');
const fieldSun = new Field({ weather: 'Sun' });

// Defender: Incineroar (Def 130)
const incineroar = new Pokemon(gen, 'Incineroar', {
    level: 50, item: 'Sitrus Berry', nature: 'Bold', evs: { hp: 252 }
});
incineroar.stats.hp = 202;
incineroar.stats.def = 130;

// Scenario 1: Field Sun + Default Ability (User)
const koraidon1 = new Pokemon(gen, 'Koraidon', {
    level: 50, nature: 'Adamant', evs: { atk: 252 },
    boosts: { atk: -1 }
});
console.log(`[1] Koraidon (Atk 205, -1) w/ Sun`);
console.log(`Stats Atk: ${koraidon1.stats.atk}`);
const res1 = calculate(gen, koraidon1, incineroar, move, fieldSun);
console.log(`Range: ${res1.range().join('-')}`);
console.log(`Desc: ${res1.desc()}`);

// Scenario 2: AbilityOn Force + NO Field Sun (Check double dipping hypothesis)
const koraidon2 = new Pokemon(gen, 'Koraidon', {
    level: 50, nature: 'Adamant', evs: { atk: 252 },
    boosts: { atk: -1 },
    overrides: { abilityOn: true }
});
const res2 = calculate(gen, koraidon2, incineroar, move); // NO fieldSun
console.log(`[2] Koraidon (Atk 205, -1) w/ AbilityOn (No Field Sun)`);
console.log(`Range: ${res2.range().join('-')}`);
console.log(`Desc: ${res2.desc()}`);

// Scenario 3: Manual Stats (User Hypo)
const koraidon3 = new Pokemon(gen, 'Koraidon', {
    level: 50, nature: 'Adamant', evs: { atk: 252 }
});
koraidon3.stats.atk = 136;
const res3 = calculate(gen, koraidon3, incineroar, move, fieldSun);
console.log(`[3] Koraidon (Atk 136, 0) w/ Sun`);
console.log(`Range: ${res3.range().join('-')}`);

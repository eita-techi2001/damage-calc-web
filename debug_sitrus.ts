
import { calculate, Generations, Pokemon, Move } from '@smogon/calc';

const gen = Generations.get(8);

// Garchomp vs Rotom-Wash (Sitrus Berry)
const attacker = new Pokemon(gen, 'Garchomp', {
    item: 'Choice Band',
    nature: 'Adamant',
    evs: { atk: 252 }
});

const defender = new Pokemon(gen, 'Rotom-Wash', {
    item: 'Sitrus Berry',
    nature: 'Bold',
    evs: { hp: 252, def: 252 }
});

const move = new Move(gen, 'Dragon Claw');
const moveStrong = new Move(gen, 'Outrage');

const result = calculate(gen, attacker, defender, move);
const resultStrong = calculate(gen, attacker, defender, moveStrong);

import * as fs from 'fs';

// Check Leftovers for comparison
const defenderLeftovers = new Pokemon(gen, 'Rotom-Wash', {
    item: 'Leftovers',
    nature: 'Bold',
    evs: { hp: 252, def: 252 }
});

const resultLeftovers = calculate(gen, attacker, defenderLeftovers, move);

const output = {
    sitrusDragonClaw: {
        attacker: attacker.name,
        defender: defender.name,
        hp: defender.stats.hp,
        damageRange: result.range(),
        koText: result.kochance().text,
        koChance: result.kochance().chance,
    },
    sitrusOutrage: {
        damageRange: resultStrong.range(),
        koText: resultStrong.kochance().text,
    },
    leftovers: {
        koText: resultLeftovers.kochance().text,
    }
};

fs.writeFileSync('debug_output.json', JSON.stringify(output, null, 2));
console.log('Done writing debug_output.json');



import { calculate, Generations, Pokemon, Move } from '@smogon/calc';

const gen = Generations.get(9);

// Setup: Garchomp (Choice Band) vs Rotom-W (Sitrus)
// Goal: Find a scenario where it's a "Chance to 2HKO" (Random 2HKO)
// Dragon Claw with Choice Band was hitting 148 ~ 175.
// Rotom HP is 304. Sitrus triggers at <= 152. Recovery = 76.
// 2 hits:
// Max dmg: 175 * 2 = 350 > 304 + 76? (380). No.
// Wait, if max damage is 175, 2 hits = 350. Rotom HP = 304.
// If first hit puts it in Sitrus range...
// 304 - 175 = 129. Sitrus triggers (129 <= 152). HP becomes 129 + 76 = 205.
// Next hit needs 205 damage. Max is 175.
// So Dragon Claw CB is NEVER 2HKO with Sitrus. It's guaranteed 3HKO.
// My previous specific debug output said "94.9% chance to 2HKO" (Smogon) which IGNORES Sitrus.
// My fix correctly identified it as "Guaranteed 3HKO".

// Need a scenario that IS actually a random 2HKO *with* Sitrus.
// Adjusted HP/Def or Move power needed.
// Rotom-W HP: 304. Sitrus: 76. Threshold: 152.
// To kill in 2 hits through Sitrus:
// D1 + D2 >= 304 + 76 = 380.
// Avg Dmg needed = 190.
// Range needs to include 190.
// Let's try Outrage (120 BP) vs Dragon Claw (80 BP).
// Outrage range was 222 ~ 262.
// 222 * 2 = 444 > 380. Guaranteed 2HKO.
// Need something in between. ~100 BP? Or adjusted stats.
// Let's use Dragon Claw but remove Rotom's Defense EVs.

const attacker = new Pokemon(gen, 'Garchomp', {
    item: 'Choice Band',
    nature: 'Adamant',
    evs: { atk: 252 }
});

const defender = new Pokemon(gen, 'Rotom-Wash', {
    item: 'Sitrus Berry',
    nature: 'Bold',
    evs: { hp: 252, def: 0 } // Lower Def to increase damage
});

const move = new Move(gen, 'Dragon Claw');
const result = calculate(gen, attacker, defender, move);

const damageRange = result.range();
const hp = defender.stats.hp;
const sitrusThreshold = Math.floor(hp / 2);
const sitrusRecovery = Math.floor(hp / 4);

console.log(`HP: ${hp}, Sitrus Threshold: ${sitrusThreshold}, Recovery: ${sitrusRecovery}`);
console.log(`Damage Range: ${damageRange}`); // array of 16 numbers

// Exhaustive Simulation for 2HKO
let koCount = 0;
let totalCombinations = 0;

// SV rolls are 16 values.
// range() returns them sorted.
const rolls = result.damage as number[];

if (!Array.isArray(rolls) || rolls.length !== 16) {
    console.log("Error: rolls is not array of 16", rolls);
} else {
    for (const d1 of rolls) {
        for (const d2 of rolls) {
            totalCombinations++;

            let currentHP = hp - d1;
            // Sitrus Check
            if (currentHP > 0 && currentHP <= sitrusThreshold) {
                currentHP += sitrusRecovery;
            }

            if (currentHP > 0) {
                currentHP -= d2;
            }

            if (currentHP <= 0) {
                koCount++;
            }
        }
    }
}

const percent = (koCount / totalCombinations) * 100;
console.log(`2HKO Combinations: ${koCount}/${totalCombinations}`);
console.log(`Calculated %: ${percent.toFixed(2)}%`);

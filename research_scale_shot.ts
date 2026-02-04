
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';
import * as fs from 'fs';

const gen = Generations.get(9);

// Defender: Chien-Pao (4 HP)
const defender = new Pokemon(gen, 'Chien-Pao', {
    evs: { hp: 4 },
});

let output = '';

// Helper to run calc
function runCalc(label: string, attackerItem: string, moveOptions: any = {}) {
    output += `\n--- ${label} ---\n`;

    // Attacker: Dragonite (Adamant, 252 Atk) + Item
    const attacker = new Pokemon(gen, 'Dragonite', {
        item: attackerItem,
        nature: 'Adamant',
        evs: { atk: 252 },
    });

    // Scale Shot
    const move = new Move(gen, 'Scale Shot', moveOptions);

    // Field (Standard)
    const field = new Field();

    // Calculate
    const result = calculate(gen, attacker, defender, move, field);

    output += `Move: ${move.name} (Hits: ${move.hits || 'Default'})\n`;
    output += `Item: ${attacker.item}\n`;

    // Check damage output format
    // result.damage is typically number[] for one hit, OR number for fixed damage.
    // result.desc() gives the human readable string.
    output += `Description: ${result.desc()}\n`;

    // Log the raw damage stats if useful
    output += `Damage Type: ${typeof result.damage}\n`;
    if (Array.isArray(result.damage)) {
        output += `Damage Array Length: ${result.damage.length}\n`;
        output += `Damage (First 3): ${result.damage.slice(0, 3)}...\n`;
    }
}

function main() {
    output += "Researching Scale Shot (Dragonite vs Chien-Pao)\n";

    // Case 1: No Item, Default
    runCalc("Case 1: No Item, Unspecified Hits", "");

    // Case 2: Loaded Dice
    runCalc("Case 2: Loaded Dice", "Loaded Dice");

    // Case 3: Forced 5 Hits
    runCalc("Case 3: Forced 5 Hits", "", { hits: 5 });

    // Case 4: Forced 4 Hits (Loaded Dice standard)
    runCalc("Case 4: Forced 4 Hits", "Loaded Dice", { hits: 4 });

    fs.writeFileSync('desc.txt', output);
    console.log("Done writing desc.txt");
}

main();

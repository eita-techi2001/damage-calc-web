
import { Generations, Pokemon } from '@smogon/calc';

const gen = Generations.get(9);
const speciesList = [
    "Incineroar",
    "Rillaboom",
    "Urshifu-Rapid-Strike",
    "Flutter Mane",
    "Chien-Pao",
    "Chi-Yu",
    "Landorus",
    "Raging Bolt",
    "Dragonite",
    "Calyrex-Shadow",
    "Calyrex-Ice",
    "Miraidon",
    "Koraidon"
];

console.log("Testing Species Construction...");

speciesList.forEach(name => {
    try {
        const p = new Pokemon(gen, name);
        console.log(`[OK] ${name} -> ${p.species.name} (Mega: ${!!(p.species as any).megaEvolves})`);
    } catch (e) {
        console.error(`[FAIL] ${name} CRASHED:`, e);
    }
});

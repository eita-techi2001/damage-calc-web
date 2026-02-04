
import { Generations, Pokemon } from '@smogon/calc';

const gen = Generations.get(9);

console.log("Testing Dragonite with Empty Item...");

try {
    const options = {
        item: "", // Emulate MetaDefinitions entry
        nature: "Adamant",
        ability: "Multiscale",
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        level: 50
    };

    console.log("Creating Pokemon with options:", JSON.stringify(options));
    const p = new Pokemon(gen, "Dragonite", options);
    console.log(`[OK] Created ${p.species.name} (Item: '${p.item}')`);
} catch (e: any) {
    console.error("[FAIL] CRASHED with options:", e);
    if (e.stack) console.error(e.stack);
}

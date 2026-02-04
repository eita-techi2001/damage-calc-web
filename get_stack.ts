
import { calculateDamageForConfig } from './src/lib/logic';
import { UserPokemonConfig } from './src/types';

async function runTest() {
    console.log("=== Stack Trace Capture ===");

    // Config that triggers the error
    const config: UserPokemonConfig = {
        species: "Incineroar",
        item: "Sitrus Berry",
        nature: "Careful",
        ability: "Intimidate",
        evs: { hp: 252, atk: 0, def: 156, spa: 0, spd: 100, spe: 0 },
        moves: ["Fake Out"]
    };

    try {
        await calculateDamageForConfig(config);
        console.log("SUCCESS (Unexpected)");
    } catch (e: any) {
        console.log("\n------------ ERROR START ------------");
        console.log(e.stack || e);
        console.log("------------ ERROR END ------------\n");
    }
}

runTest();

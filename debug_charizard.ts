
import { toEnglish } from './src/core/translator';
import { calculateDamageForConfig } from './src/lib/logic';
import { UserPokemonConfig } from './src/types';

async function runTest() {
    console.log("Testing Translations...");
    const jpName = "リザードン";
    const engName = toEnglish(jpName);
    console.log(`'${jpName}' -> '${engName}'`);

    const jpMega = "メガリザードンY";
    const engMega = toEnglish(jpMega);
    console.log(`'${jpMega}' -> '${engMega}'`);

    const jpVenusaur = "メガフシギバナ";
    const engVenusaur = toEnglish(jpVenusaur);
    console.log(`'${jpVenusaur}' -> '${engVenusaur}'`);

    if (engName === jpName) {
        console.error("CRITICAL: Translation failed! Dictionary might be missing or hardcode didn't work.");
    } else {
        console.log("Translation seems OK.");
    }

    // Simulation Calculation with Japanese Name (Directly to Logic, bypassing frontend fix?)
    // If logic works with English, and Frontend sends English, we are good.
    // If Logic receives Japanese, it should fail.

    console.log("\nTesting Logic with JAPANESE Input (Should Fail if logic doesn't handle it):");
    const badConfig: UserPokemonConfig = {
        species: "リザードン",
        item: "Life Orb",
        nature: "Timid",
        ability: "Blaze",
        evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 4, spe: 252 },
        moves: ["Flamethrower"]
    };

    try {
        await calculateDamageForConfig(badConfig);
        console.log("WOW: Calculation with Japanese Name SUCCEEDED (Unexpected?)");
    } catch (e) {
        console.log("Caught expected error with Japanese Input:", e);
    }

    console.log("\nTesting Logic with ENGLISH Input (Should Succeed):");
    const goodConfig: UserPokemonConfig = {
        ...badConfig,
        species: "Charizard"
    };

    try {
        await calculateDamageForConfig(goodConfig);
        console.log("Calculation with English Name SUCCEEDED.");
    } catch (e) {
        console.error("Calculation with English Name FAILED:", e);
    }
}

runTest();

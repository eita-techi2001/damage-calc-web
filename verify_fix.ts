
import { calculateDamageForConfig } from './src/lib/logic';
import { MetaPokemons } from './src/data/meta_pokemons';
import { UserPokemonConfig } from './src/types';

async function runTest() {
    console.log(`Starting scan of ${MetaPokemons.length} opponents...`);

    const attacker: UserPokemonConfig = {
        species: "Incineroar",
        item: "Sitrus Berry",
        nature: "Careful",
        ability: "Intimidate",
        evs: { hp: 252, atk: 0, def: 156, spa: 0, spd: 100, spe: 0 },
        moves: ["Fake Out"]
    };

    for (const defender of MetaPokemons) {
        console.log(`> Checking: ${defender.species} (${defender.item || 'No Item'})`);
        try {
            await calculateDamageForConfig(attacker, undefined, [defender]);
            console.log(`  [OK]`);
        } catch (e: any) {
            console.log(`\n!!! CRASH DETECTED !!!`);
            console.log(`Failed Species: ${defender.species}`);
            console.log(`Error: ${e.message}`);
            process.exit(1);
        }
    }
    console.log("\nAll passed.");
}

runTest();

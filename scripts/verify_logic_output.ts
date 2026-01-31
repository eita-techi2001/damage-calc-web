
import { calculateDamageForConfig } from '../src/lib/logic';
import { UserPokemonConfig } from '../src/types';

const flutterManeConfig: UserPokemonConfig = {
    species: 'Flutter Mane',
    nature: 'Modest',
    ability: 'Protosynthesis',
    item: 'Booster Energy',
    evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
    moves: ['Moonblast', 'Shadow Ball', 'Dazzling Gleam', 'Protect']
};

async function run() {
    try {
        console.log("Running calculation for Flutter Mane...");
        const result = await calculateDamageForConfig(flutterManeConfig);
        if (result.attack.length > 0) {
            console.log("First Attack Result Detail:", result.attack[0]['詳細']);
            console.log("Full Row keys:", Object.keys(result.attack[0]));
        } else {
            console.log("No attack results found.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

run();

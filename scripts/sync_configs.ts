
import fs from 'fs';
import path from 'path';
import { MetaDefinitions } from '../src/data/meta_definitions';

// Helper to sanitize filename
const toID = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

const main = () => {
    // Correct path relative to where script is run (project root usually)
    // We assume running from web-app root
    const outputDir = path.resolve('src/configs/pokemons');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Clean up existing files to ensure exact sync? 
    // User wants "selectable" to be these. 
    // Let's clear the directory first to remove any stale "All Pokemon" files if my previous cleanup missed any, 
    // or just overwrite. Overwriting is safer.

    let count = 0;

    for (const def of MetaDefinitions) {
        const id = toID(def.species);
        const filename = `${id}.json`;
        const filePath = path.join(outputDir, filename);

        // Map MetaDefinition (Opponent) to UserConfig (Player)
        // MetaDefinition has: species, item, nature, ability, evs, moves, teraType
        // UserConfig needs: species, level, nature, ability, item, evs, ivs, teraType, moves

        const config = {
            species: def.species,
            level: 50,
            nature: def.nature || 'Serious',
            ability: def.ability || '',
            item: def.item || '',
            evs: def.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, // Default 31 IVs
            teraType: def.teraType || 'Stellar',
            moves: def.moves || []
        };

        fs.writeFileSync(filePath, JSON.stringify(config, null, 4));
        console.log(`Generated config for ${def.species}`);
        count++;
    }

    console.log(`Successfully synchronized ${count} Pokemon configs.`);
};

main();

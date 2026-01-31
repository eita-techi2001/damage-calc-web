
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as calc from '@smogon/calc';

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to sanitize filename
const toID = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

// Basic Move Mapping
const TYPE_MOVES = {
    'Normal': { phys: 'Body Slam', spec: 'Hyper Voice' },
    'Fire': { phys: 'Flare Blitz', spec: 'Heat Wave' },
    'Water': { phys: 'Liquidation', spec: 'Surf' },
    'Electric': { phys: 'Wild Charge', spec: 'Thunderbolt' },
    'Grass': { phys: 'Wood Hammer', spec: 'Energy Ball' },
    'Ice': { phys: 'Icicle Crash', spec: 'Ice Beam' },
    'Fighting': { phys: 'Close Combat', spec: 'Aura Sphere' },
    'Poison': { phys: 'Gunk Shot', spec: 'Sludge Bomb' },
    'Ground': { phys: 'Earthquake', spec: 'Earth Power' },
    'Flying': { phys: 'Brave Bird', spec: 'Hurricane' },
    'Psychic': { phys: 'Psychic Fangs', spec: 'Psychic' },
    'Bug': { phys: 'U-turn', spec: 'Bug Buzz' },
    'Rock': { phys: 'Rock Slide', spec: 'Power Gem' },
    'Ghost': { phys: 'Poltergeist', spec: 'Shadow Ball' },
    'Dragon': { phys: 'Dragon Claw', spec: 'Draco Meteor' },
    'Dark': { phys: 'Knock Off', spec: 'Dark Pulse' },
    'Steel': { phys: 'Iron Head', spec: 'Flash Cannon' },
    'Fairy': { phys: 'Play Rough', spec: 'Moonblast' },
    'Stellar': { phys: 'Tera Blast', spec: 'Tera Blast' }
};

const getGenericMoves = (types, isPhysical) => {
    const moves = [];
    for (const type of types) {
        if (TYPE_MOVES[type]) {
            moves.push(isPhysical ? TYPE_MOVES[type].phys : TYPE_MOVES[type].spec);
        }
    }
    while (moves.length < 4) moves.push('Protect');
    return moves.slice(0, 4);
};

const main = () => {
    const gen9 = calc.Generations.get(9);
    const outputDir = path.join(__dirname, '../src/configs/pokemons');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const existingFiles = new Set(fs.readdirSync(outputDir).map(f => f.toLowerCase()));

    let count = 0;
    for (const species of gen9.species) {
        if (species.nfe) continue;

        const id = toID(species.name);
        if (!id) continue;
        const filename = `${id}.json`;

        if (existingFiles.has(filename)) {
            // Skip existing
            continue;
        }

        const isPhysical = species.baseStats.atk >= species.baseStats.spa;

        const config = {
            species: species.name,
            level: 50,
            nature: isPhysical ? 'Adamant' : 'Modest',
            ability: species.abilities?.[0] || '',
            item: '',
            evs: {
                hp: 252,
                atk: isPhysical ? 252 : 0,
                def: 4,
                spa: isPhysical ? 0 : 252,
                spd: 0,
                spe: 0
            },
            ivs: {
                hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31
            },
            teraType: species.types[0],
            moves: getGenericMoves(species.types, isPhysical)
        };

        fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(config, null, 4));
        count++;
    }

    console.log(`Generated ${count} new Pokemon configs.`);
};

main();

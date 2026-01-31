
import * as calc from '@smogon/calc';
import { MetaPokemonVariant } from '../types';

// Helper to guess moves based on type (Placeholder)
// Basic Move Mapping
const TYPE_MOVES: { [key: string]: { phys: string, spec: string } } = {
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

const getGenericMoves = (types: string[], isPhysical: boolean): string[] => {
    const moves: string[] = [];
    for (const type of types) {
        if (TYPE_MOVES[type]) {
            moves.push(isPhysical ? TYPE_MOVES[type].phys : TYPE_MOVES[type].spec);
        }
    }
    // Fill remaining slots
    if (moves.length < 4) moves.push('Protect');
    return moves;
};

export const getAllPokemonDefinitions = (): MetaPokemonVariant[] => {
    const gen9 = calc.Generations.get(9);
    const allSpecies = gen9.species; // Map<ID, Species>

    const variants: MetaPokemonVariant[] = [];

    for (const species of allSpecies) {
        // Filter out obviously irrelevant forms (optional)
        if (species.nfe) continue; // Skip Not Fully Evolved
        // Skip some weird forms if needed, but "All" means All.

        // Determine Category (Physical/Special) based on stats
        const isPhysical = species.baseStats.atk >= species.baseStats.spa;

        // Generic Build
        const variant: MetaPokemonVariant = {
            species: species.name,
            item: '', // Will be filled by Ranking logic if defined, else default
            nature: isPhysical ? 'Adamant' : 'Modest',
            ability: species.abilities?.[0] || '',
            evs: { hp: 252, atk: isPhysical ? 252 : 0, def: 4, spa: isPhysical ? 0 : 252, spd: 0, spe: 0 }, // Generic bulky attacker
            moves: getGenericMoves(species.types, isPhysical),
            teraType: species.types[0] // Default Tera
        };

        variants.push(variant);
    }

    // Sort alphabetically
    variants.sort((a, b) => a.species.localeCompare(b.species));
    return variants;
};

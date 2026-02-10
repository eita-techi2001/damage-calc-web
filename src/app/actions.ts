'use server';

import fs from 'fs';
import path from 'path';
import { calculateDamageForConfig } from '@/lib/logic';
import { UserPokemonConfig, PokemonStats, GlobalFieldState, CalculationSettings } from '@/types';
import { Generations } from '@smogon/calc';

const CONFIG_DIR = path.join(process.cwd(), 'src/configs/pokemons');
const gen = Generations.get(9);

export async function getAvailableConfigs(): Promise<string[]> {
    try {
        const files = fs.readdirSync(CONFIG_DIR).filter((f: string) => f.endsWith('.json'));
        return files.map((f: string) => f.replace('.json', ''));
    } catch (e) {
        console.error('Error reading configs:', e);
        return [];
    }
}

// NEW: Get all moves from Gen 9
export async function getAllMoves(): Promise<string[]> {
    try {
        const moves: string[] = [];
        for (const move of gen.moves) {
            moves.push(move.name);
        }
        return moves.sort();
    } catch (e) {
        console.error('Error getting moves:', e);
        return [];
    }
}

// Helper to normalize species names
const toID = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

// NEW: Get learnset for a species


export async function getLearnset(species: string): Promise<string[]> {
    try {
        const learnsetPath = path.join(process.cwd(), 'src/data/learnsets.json');
        if (!fs.existsSync(learnsetPath)) return []; // Fallback

        const fileContent = fs.readFileSync(learnsetPath, 'utf8');
        const learnsets = JSON.parse(fileContent);
        const id = toID(species);

        let data = learnsets[id];
        if (!data) {
            // Try stripping forms if not found (e.g. Calyrex-Ice -> calyrexice might be in file, or calyrex)
            // Showdown usually has full keys like 'calyrexice'. 
            // If missing, maybe alias?
            // For now return empty to trigger fallback.
            return [];
        }

        if (!data.learnset) return [];

        const moveIds = Object.keys(data.learnset);
        const moveNames = moveIds.map(id => {
            const m = gen.moves.get(id as any);
            return m ? m.name : id;
        }).filter(m => m).sort();

        return moveNames;
    } catch (e) {
        console.error('Error fetching learnset:', e);
        return [];
    }
}


// NEW: Load config for client-side editing
export async function loadConfig(speciesFile: string): Promise<{ success: boolean, data?: UserPokemonConfig, baseStats?: PokemonStats, error?: string }> {
    try {
        const filePath = path.join(CONFIG_DIR, `${speciesFile}.json`);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const config: UserPokemonConfig = JSON.parse(fileContent);

        // Fetch Base Stats
        // Use toID to ensure we match the key in @smogon/calc
        let lookupSpecies = config.species;
        if (lookupSpecies === 'Terapagos') lookupSpecies = 'Terapagos-Terastal';

        const species = gen.species.get(toID(lookupSpecies) as any) || gen.species.get(lookupSpecies as any);

        // Check for 'bs' (older) or 'stats' (newer smogon/calc). Debug confirmed 'baseStats'.
        const baseStats = species ? (species as any).baseStats : { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };

        return { success: true, data: config, baseStats };
    } catch (e) {
        console.error('Error loading config:', e);
        return { success: false, error: String(e) };
    }
}

// NEW: Calculate using custom config from client

// Get default opponents list for client-side management
export async function getMetaOpponents() {
    const { MetaPokemons } = await import('@/data/meta_pokemons');
    // We attach an ID to them for client-side tracking if needed, or rely on index/species
    return { success: true, data: MetaPokemons };
}

// Get ALL species for search
export async function getAllSpecies() {
    try {
        const filePath = path.join(process.cwd(), 'src/data/pokedex_multilang.json');
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // Return just the English names, as the file is already sorted and deduplicated
            return { success: true, data: data.map((d: any) => d.name.english) };
        }

        // Fallback if file missing (should shouldn't happen)
        const { Generations } = await import('@smogon/calc');
        const gen = Generations.get(9);
        const speciesList: string[] = [];
        for (const s of gen.species) {
            speciesList.push(s.name);
        }
        speciesList.sort();
        return { success: true, data: speciesList };
    } catch (e) {
        return { success: false, error: String(e) };
    }
}

export async function calculateCustom(config: UserPokemonConfig, globalField?: GlobalFieldState, explicitOpponents?: UserPokemonConfig[], settings?: CalculationSettings) {
    try {
        // DEBUG: Log received data
        console.log('[SERVER] calculateCustom called');
        console.log('[SERVER] User config level:', config.level);
        console.log('[SERVER] User config ivs:', JSON.stringify(config.ivs));
        console.log('[SERVER] User config ivs.hp:', config.ivs?.hp);
        console.log('[SERVER] User config ranks:', JSON.stringify(config.ranks));
        console.log('[SERVER] User config evs:', JSON.stringify(config.evs));
        if (explicitOpponents && explicitOpponents.length > 0) {
            console.log('[SERVER] First opponent level:', explicitOpponents[0].level);
            console.log('[SERVER] First opponent ivs:', JSON.stringify(explicitOpponents[0].ivs));
            console.log('[SERVER] First opponent ranks:', JSON.stringify(explicitOpponents[0].ranks));
        }

        // Fix Terapagos: Force Terastal Form for calculation
        if (config.species === 'Terapagos') {
            config = { ...config, species: 'Terapagos-Terastal' };
            if (config.ability === 'Tera Shift' || config.ability === 'テラスチェンジ') {
                config.ability = 'Tera Shell';
            }
        }

        // If explicitOpponents is provided, we use it directly (it contains defaults + customs)
        // logic.ts needs to know this.
        const results = await calculateDamageForConfig(config, globalField, explicitOpponents, settings);
        return { success: true, data: results };
    } catch (e) {
        console.error('[SERVER] Error calculating custom damage:', e);
        // Log the full error with stack trace
        if (e instanceof Error) {
            console.error('[SERVER] Error stack:', e.stack);
        }
        return { success: false, error: String(e) };
    }
}

export async function calculate(speciesFile: string, globalField?: GlobalFieldState, settings?: CalculationSettings) {
    try {
        const filePath = path.join(CONFIG_DIR, `${speciesFile}.json`);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        let config: UserPokemonConfig = JSON.parse(fileContent);

        // Fix Terapagos: Force Terastal Form for calculation
        if (config.species === 'Terapagos') {
            config = { ...config, species: 'Terapagos-Terastal' };
            if (config.ability === 'Tera Shift' || config.ability === 'テラスチェンジ') {
                config.ability = 'Tera Shell';
            }
        }

        const results = await calculateDamageForConfig(config, globalField, undefined, settings);
        return { success: true, data: results };
    } catch (e) {
        console.error('Error calculating damage:', e);
        return { success: false, error: String(e) };
    }
}

// NEW: Get full translation dictionary
export async function getTranslationData(): Promise<{ pokemon: Record<string, string>, moves: Record<string, string>, abilities: Record<string, string> }> {
    try {
        const movesPath = path.join(process.cwd(), 'src/data/moves_multilang.json');
        const monsPath = path.join(process.cwd(), 'src/data/pokedex_multilang.json');
        const abilsPath = path.join(process.cwd(), 'src/data/abilities_multilang.json');

        const moves: Record<string, string> = {};
        const pokemon: Record<string, string> = {};
        const abilities: Record<string, string> = {};

        if (fs.existsSync(movesPath)) {
            const movesData = JSON.parse(fs.readFileSync(movesPath, 'utf8'));
            for (const m of movesData) {
                if (m.ename && m.jname) {
                    moves[m.ename] = m.jname;
                }
            }
        }

        if (fs.existsSync(monsPath)) {
            const monsData = JSON.parse(fs.readFileSync(monsPath, 'utf8'));
            for (const p of monsData) {
                if (p.name && p.name.english && p.name.japanese) {
                    pokemon[p.name.english] = p.name.japanese;
                }
            }
        }

        if (fs.existsSync(abilsPath)) {
            const abilsData = JSON.parse(fs.readFileSync(abilsPath, 'utf8'));
            for (const a of abilsData) {
                if (a.english && a.japanese) {
                    abilities[a.english] = a.japanese;
                }
            }
        }

        return { moves, pokemon, abilities };
    } catch (e) {
        console.error('Error fetching translations:', e);
        return { moves: {}, pokemon: {}, abilities: {} };
    }
}

export async function getPokemonData(species: string) {
    try {
        // Alias Terapagos -> Terapagos-Terastal (User Request)
        if (species === 'Terapagos') {
            species = 'Terapagos-Terastal';
        }

        // Use local full data first
        const fullDataPath = path.join(process.cwd(), 'src/data/pokemon_data_full.json');
        if (fs.existsSync(fullDataPath)) {
            const fullData = JSON.parse(fs.readFileSync(fullDataPath, 'utf8'));
            // Try exact match or case insensitive key search?
            // Showdown keys in json are usually Species Name (e.g. "Incineroar").
            // BUT my build script stored `output[entry.name] = ...`. 
            // Entry name is "Incineroar".

            let data = fullData[species];

            // If not found, try to find by some normalization if needed?
            // Usually species passed here is correctly capitalized if coming from our search list.
            // But if coming from search input (user typed), might mismatch.
            // However search list is built from names.

            if (!data) {
                // Try looking up via key matching logic if strict match fails
                // (Optional: loop keys if needed, but big perf hit. Assume Correct Case for now)
            }

            if (data) {
                return {
                    success: true,
                    data: {
                        species: species,
                        baseStats: data.baseStats,
                        abilities: data.abilities,
                        types: data.types
                    }
                };
            }
        }

        // Fallback to @smogon/calc behavior (Original Logic) if local file missing or species not found
        const { Generations, Pokemon } = await import('@smogon/calc');
        const gen = Generations.get(9);
        const p = new Pokemon(gen, species);
        return {
            success: true,
            data: {
                species: p.species.name,
                baseStats: (p.species as any).bs || (p.species as any).baseStats,
                abilities: p.species.abilities,
                types: p.types
            }
        };
    } catch (e) {
        return { success: false, error: String(e) };
    }
}

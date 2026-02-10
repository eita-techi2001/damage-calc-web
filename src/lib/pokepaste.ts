import { UserPokemonConfig, PokemonStats } from '@/types';
import { t, toEnglish } from '@/core/translator';

/**
 * Parse a single Pokemon from PokePaste format (Showdown format)
 * Supports both English and Japanese input
 *
 * Example format:
 * Incineroar @ Assault Vest
 * Ability: Intimidate
 * Level: 50
 * Tera Type: Grass
 * EVs: 252 HP / 4 Atk / 252 SpD
 * Adamant Nature
 * - Fake Out
 * - Flare Blitz
 * - Knock Off
 * - Parting Shot
 */
export function parsePokePaste(text: string): UserPokemonConfig | null {
    try {
        const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) return null;

        // Line 1: Species @ Item
        const firstLine = lines[0];
        let species = '';
        let item = '';

        if (firstLine.includes(' @ ')) {
            const parts = firstLine.split(' @ ');
            species = toEnglish(parts[0].trim());
            item = toEnglish(parts[1].trim());
        } else {
            species = toEnglish(firstLine.trim());
        }

        // Remove gender indicators (M) or (F) from species name
        // e.g., "Incineroar (F)" -> "Incineroar"
        species = species.replace(/\s*\([MF]\)$/, '').trim();

        // Default values
        let level = 50;
        let nature = 'Serious' as any;
        let ability = '' as any;
        let teraType = undefined as any;
        const evs: PokemonStats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        const ivs: PokemonStats = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
        const moves: string[] = [];

        // Parse subsequent lines
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];

            // Ability
            if (line.startsWith('Ability:') || line.startsWith('特性:')) {
                ability = toEnglish(line.split(':')[1].trim());
            }
            // Level
            else if (line.startsWith('Level:') || line.startsWith('レベル:')) {
                level = parseInt(line.split(':')[1].trim()) || 50;
            }
            // Tera Type
            else if (line.startsWith('Tera Type:') || line.startsWith('テラスタイプ:')) {
                teraType = toEnglish(line.split(':')[1].trim());
            }
            // EVs
            else if (line.startsWith('EVs:') || line.startsWith('努力値:')) {
                const evString = line.split(':')[1].trim();
                parseEVs(evString, evs);
            }
            // IVs
            else if (line.startsWith('IVs:') || line.startsWith('個体値:')) {
                const ivString = line.split(':')[1].trim();
                parseEVs(ivString, ivs);
            }
            // Nature
            else if (line.includes('Nature') || line.includes('性格')) {
                nature = toEnglish(line.replace(/Nature|性格/g, '').trim()) as any;
            }
            // Moves
            else if (line.startsWith('-') || line.startsWith('−') || line.startsWith('–')) {
                const move = toEnglish(line.substring(1).trim());
                if (move) moves.push(move);
            }
        }

        // Pad moves to 4
        while (moves.length < 4) moves.push('');

        if (!species || !ability) {
            return null;
        }

        return {
            species,
            level,
            nature,
            ability,
            item: item || '',
            evs,
            ivs,
            moves,
            teraType,
            ranks: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        };
    } catch (error) {
        console.error('Failed to parse PokePaste:', error);
        return null;
    }
}

/**
 * Parse EVs/IVs string like "252 HP / 4 Atk / 252 SpD"
 */
function parseEVs(evString: string, target: PokemonStats) {
    const parts = evString.split('/').map(p => p.trim());

    for (const part of parts) {
        const match = part.match(/(\d+)\s*(.+)/);
        if (match) {
            const value = parseInt(match[1]);
            const stat = toEnglish(match[2].trim()).toLowerCase();

            if (stat.includes('hp')) target.hp = value;
            else if (stat.includes('atk') || stat.includes('attack') || stat === 'a') target.atk = value;
            else if (stat.includes('def') || stat.includes('defense') || stat === 'b') target.def = value;
            else if (stat.includes('spa') || stat.includes('special attack') || stat === 'c') target.spa = value;
            else if (stat.includes('spd') || stat.includes('special defense') || stat === 'd') target.spd = value;
            else if (stat.includes('spe') || stat.includes('speed') || stat === 's') target.spe = value;
        }
    }
}

/**
 * Parse multiple Pokemon from a PokePaste text (separated by blank lines)
 */
export function parseMultiplePokePaste(text: string): UserPokemonConfig[] {
    const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
    return blocks.map(block => parsePokePaste(block)).filter(p => p !== null) as UserPokemonConfig[];
}

/**
 * Format a Pokemon config to PokePaste format
 * @param config Pokemon configuration
 * @param language 'en' for English, 'ja' for Japanese
 */
export function formatToPokePaste(config: UserPokemonConfig, language: 'en' | 'ja' = 'en'): string {
    const translate = language === 'ja' ? t : (s: string) => s;

    const lines: string[] = [];

    // Line 1: Species @ Item
    const speciesName = translate(config.species);
    const itemName = config.item ? translate(config.item) : '';
    lines.push(itemName ? `${speciesName} @ ${itemName}` : speciesName);

    // Ability
    if (config.ability) {
        lines.push(`${language === 'ja' ? '特性' : 'Ability'}: ${translate(config.ability)}`);
    }

    // Level (only if not 50)
    if (config.level && config.level !== 50) {
        lines.push(`${language === 'ja' ? 'レベル' : 'Level'}: ${config.level}`);
    }

    // Tera Type
    if (config.teraType) {
        lines.push(`${language === 'ja' ? 'テラスタイプ' : 'Tera Type'}: ${translate(config.teraType)}`);
    }

    // EVs
    const evParts: string[] = [];
    if (config.evs.hp > 0) evParts.push(`${config.evs.hp} ${translate('HP')}`);
    if (config.evs.atk > 0) evParts.push(`${config.evs.atk} ${translate('Atk')}`);
    if (config.evs.def > 0) evParts.push(`${config.evs.def} ${translate('Def')}`);
    if (config.evs.spa > 0) evParts.push(`${config.evs.spa} ${translate('SpA')}`);
    if (config.evs.spd > 0) evParts.push(`${config.evs.spd} ${translate('SpD')}`);
    if (config.evs.spe > 0) evParts.push(`${config.evs.spe} ${translate('Spe')}`);

    if (evParts.length > 0) {
        lines.push(`${language === 'ja' ? '努力値' : 'EVs'}: ${evParts.join(' / ')}`);
    }

    // IVs (only if not all 31)
    if (config.ivs) {
        const ivParts: string[] = [];
        if (config.ivs.hp !== 31) ivParts.push(`${config.ivs.hp} ${translate('HP')}`);
        if (config.ivs.atk !== 31) ivParts.push(`${config.ivs.atk} ${translate('Atk')}`);
        if (config.ivs.def !== 31) ivParts.push(`${config.ivs.def} ${translate('Def')}`);
        if (config.ivs.spa !== 31) ivParts.push(`${config.ivs.spa} ${translate('SpA')}`);
        if (config.ivs.spd !== 31) ivParts.push(`${config.ivs.spd} ${translate('SpD')}`);
        if (config.ivs.spe !== 31) ivParts.push(`${config.ivs.spe} ${translate('Spe')}`);

        if (ivParts.length > 0) {
            lines.push(`${language === 'ja' ? '個体値' : 'IVs'}: ${ivParts.join(' / ')}`);
        }
    }

    // Nature
    if (config.nature) {
        lines.push(`${translate(config.nature)} ${language === 'ja' ? '性格' : 'Nature'}`);
    }

    // Moves
    for (const move of config.moves) {
        if (move) {
            lines.push(`- ${translate(move)}`);
        }
    }

    return lines.join('\n');
}

/**
 * Format multiple Pokemon to PokePaste format (separated by blank lines)
 */
export function formatMultipleToPokePaste(configs: UserPokemonConfig[], language: 'en' | 'ja' = 'en'): string {
    return configs.map(c => formatToPokePaste(c, language)).join('\n\n');
}

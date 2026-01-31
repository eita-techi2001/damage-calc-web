
// Fallback types if imports fail
export type TypeName = string;
export type AbilityName = string;
export type ItemName = string;
export type NatureName = string;
export type MoveName = string;
// import { TypeName, AbilityName, ItemName, NatureName, MoveName } from '@smogon/calc';

export interface PokemonStats {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
}

export interface UserPokemonConfig {
    species: string;
    level?: number;
    nature: NatureName;
    ability: AbilityName;
    item: ItemName;
    evs: PokemonStats;
    ivs?: PokemonStats;
    ranks?: PokemonStats; // Added v2.5
    moves: MoveName[];
    teraType?: TypeName;
    boosts?: Partial<PokemonStats>;
    overrides?: any;
    groupId?: string; // Added for grouping variants
}

export interface MetaPokemonVariant {
    species: string;
    item: ItemName;
    nature: NatureName;
    ability: AbilityName;
    evs: PokemonStats;
    moves: MoveName[];
    teraType?: TypeName;
    extraLabel?: string; // e.g. "(Sun)"
    forcedField?: {
        weather?: string;
        terrain?: string;
        isDefenderIntimidated?: boolean;
        isSwordOfRuinActive?: boolean;
        isBeadsOfRuinActive?: boolean;
        isTabletsOfRuinActive?: boolean;
        isVesselOfRuinActive?: boolean;
    };
    overrides?: any;
    boosts?: Partial<PokemonStats>;
    groupId?: string; // Added for grouping variants
}

export interface CalculationResult {
    attacker: string;
    defender: string;
    move: string;
    damage: number[]; // min, max, etc.
    params: any; // Context
}

export interface GlobalFieldState {
    weather?: 'None' | 'Sun' | 'Rain' | 'Sand' | 'Snow' | 'Harsh Sunshine' | 'Heavy Rain' | 'Strong Winds';
    terrain?: 'None' | 'Electric' | 'Grassy' | 'Psychic' | 'Misty';
    opponentRanks?: PokemonStats; // Added v2.5
    userSide: {
        isReflect: boolean;
        isLightScreen: boolean;
        isFriendGuard: boolean;
        isHelpingHand: boolean;
    };
    opponentSide: {
        isReflect: boolean;
        isLightScreen: boolean;
        isFriendGuard: boolean;
    };
    global: {
        isSwordOfRuin: boolean;
        isBeadsOfRuin: boolean;
        isTabletsOfRuin: boolean;
        isVesselOfRuin: boolean;
        isSpreadDamage?: boolean; // Added for Toggle (Default true)
    };
}

export type VariantFilterMode = 'default' | 'active-only' | 'inactive-only';

export interface CalculationSettings {
    abilityVariantMode: VariantFilterMode;
    teraVariantMode: VariantFilterMode;
    excludeWeakMoves?: boolean;
}

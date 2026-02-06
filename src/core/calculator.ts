
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';
import { UserPokemonConfig, MetaPokemonVariant } from '../types';

const gen = Generations.get(9);
const field = new Field({ gameType: 'Doubles' });

export class DamageCalculator {
    // Convert User/Meta config to @smogon/calc Pokemon object
    private toCalcPokemon(config: UserPokemonConfig | MetaPokemonVariant, isDynamax: boolean = false, isTera: boolean = false): Pokemon {
        const options: any = {
            item: config.item,
            nature: config.nature,
            ability: config.ability,
            evs: config.evs,
            ivs: (config as any).ivs,
            boosts: (config as any).boosts,
            level: 50,
            // teraType: config.teraType  <-- Don't pass this by default
        };

        // Initialize overrides from config
        if ((config as any).overrides) {
            options.overrides = { ...(config as any).overrides };
            // Move specific overrides to top-level options
            if (options.overrides.abilityOn) {
                options.abilityOn = options.overrides.abilityOn;
                delete options.overrides.abilityOn;
            }
            if (options.overrides.boostedStat) {
                options.boostedStat = options.overrides.boostedStat;
                delete options.overrides.boostedStat;
            }
        }

        if (isTera && config.teraType) {
            // Do NOT override types manually errors in loss of original STAB (Adaptability check)
            // options.overrides = { ...options.overrides, types: [config.teraType] }; 
            options.teraType = config.teraType;
        }

        return new Pokemon(gen, config.species, options);
    }

    public calculateDamage(attackerConfig: UserPokemonConfig, defenderConfig: MetaPokemonVariant, moveName: string, isAttackerTera: boolean = false, isDefenderTera: boolean = false, fieldOptions: Partial<Field> & { isSpreadDamage?: boolean; multiHitCount?: number } = {}) {
        const attacker = this.toCalcPokemon(attackerConfig, false, isAttackerTera);

        // Fix for Stellar Defense: Stellar type defensively retains original typing.
        // If we set options.teraType = 'Stellar', the library might treat defensive type as 'Stellar' (losing weaknesses).
        // So for Defender, if Stellar, we generate the Pokemon WITHOUT setting teraType (isTera=false in builder),
        // but we still pass isDefenderTera=true to the calculate function.
        const isDefenderStellar = isDefenderTera && defenderConfig.teraType === 'Stellar';
        const defender = this.toCalcPokemon(defenderConfig, false, isDefenderTera && !isDefenderStellar);

        // Logic to Handle Spread Damage Rule
        // Default is TRUE (Spread moves get 0.75x in Doubles).
        // If FALSE (Single), we override target to 'Normal' to force 1.0x.
        const { isSpreadDamage = true, multiHitCount = 5, ...realFieldOptions } = fieldOptions;

        // Check original move target and apply overrides
        let move = new Move(gen, moveName);
        const moveOverrides: any = {};

        if (isSpreadDamage === false && ['allAdjacent', 'allAdjacentFoes'].includes(move.target)) {
            moveOverrides.target = 'normal';
        }

        // Set hits for multi-hit moves
        if (multiHitCount && multiHitCount !== 5) {
            moveOverrides.hits = multiHitCount;
        }

        if (Object.keys(moveOverrides).length > 0) {
            move = new Move(gen, moveName, { overrides: moveOverrides });
        }

        // Merge default field (Doubles) with overrides
        const currentField = new Field({ gameType: 'Doubles', ...realFieldOptions });

        // Calculate
        const result = calculate(gen, attacker, defender, move, currentField);
        return result;
    }

    // Add more methods for scenarios (e.g., getting hit by meta)
    public calculateReceivedDamage(attackerConfig: MetaPokemonVariant, defenderConfig: UserPokemonConfig, moveName: string, isAttackerTera: boolean = false, isDefenderTera: boolean = false, fieldOptions: Partial<Field> & { isSpreadDamage?: boolean; multiHitCount?: number } = {}) {
        const attacker = this.toCalcPokemon(attackerConfig, false, isAttackerTera);

        // Fix for Stellar Defense (User as Defender)
        const isDefenderStellar = isDefenderTera && defenderConfig.teraType === 'Stellar';
        const defender = this.toCalcPokemon(defenderConfig, false, isDefenderTera && !isDefenderStellar);

        const { isSpreadDamage = true, multiHitCount = 5, ...realFieldOptions } = fieldOptions;

        // Check original move target and apply overrides
        let move = new Move(gen, moveName);
        const moveOverrides: any = {};

        if (isSpreadDamage === false && ['allAdjacent', 'allAdjacentFoes'].includes(move.target)) {
            moveOverrides.target = 'normal';
        }

        // Set hits for multi-hit moves
        if (multiHitCount && multiHitCount !== 5) {
            moveOverrides.hits = multiHitCount;
        }

        if (Object.keys(moveOverrides).length > 0) {
            move = new Move(gen, moveName, { overrides: moveOverrides });
        }

        const currentField = new Field({ gameType: 'Doubles', ...realFieldOptions });

        return calculate(gen, attacker, defender, move, currentField);
    }
}

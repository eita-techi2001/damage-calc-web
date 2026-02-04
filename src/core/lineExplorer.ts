
import { DamageCalculator } from './calculator';
import { UserPokemonConfig, MetaPokemonVariant } from '../types';
import { Pokemon } from '@smogon/calc';

// Define Threshold Types
export type Threshold = 'OHKO' | '2HKO' | '3HKO' | '4HKO' | 'Survive';

export interface LineResult {
    success: boolean;
    evs: { [key: string]: number }; // e.g. { spa: 124 } or { hp: 252, def: 4 }
    stat?: number; // For offense (or defense now)
    totalEvCost?: number;
    description: string;
    nature?: string; // New: Nature used for the solution
    // Efficiency Comparison Fields
    efficientEvs?: { [key: string]: number };
    efficientTotal?: number;
    efficientStat?: number;
}

export class LineExplorer {
    private calc: DamageCalculator;

    constructor() {
        this.calc = new DamageCalculator();
    }

    // -------------------------------------------------------------------------
    // Offense: Find Min Atk/SpA EV to OHKO/2HKO
    // -------------------------------------------------------------------------
    public findOffensiveLine(
        user: UserPokemonConfig,
        target: MetaPokemonVariant,
        move: string,
        threshold: Threshold = 'OHKO',
        isUserTera: boolean = false,
        isTargetTera: boolean = false,
        fieldArgs: any = {}
    ): LineResult {
        // Determine stat to optimize based on Move Category or User config
        const dummyRes = this.calc.calculateDamage(user, target, move, isUserTera, isTargetTera, fieldArgs);
        const category = dummyRes.move.category;

        let statKey: 'atk' | 'spa';
        if (category === 'Physical') statKey = 'atk';
        else if (category === 'Special') statKey = 'spa';
        else return { success: false, evs: {}, description: 'Status Move' };

        // Binary Search for Min EV (0..252, step 4) -> 0..63
        let low = 0;
        let high = 63;
        let minEv = -1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const ev = mid * 4;

            // Clone User config with test EV
            const testUser = JSON.parse(JSON.stringify(user));
            testUser.evs[statKey] = ev; // Override EV

            const res = this.calc.calculateDamage(testUser, target, move, isUserTera, isTargetTera, fieldArgs);
            const range = res.range();
            const minDamage = range[0];
            const targetHP = res.defender.stats.hp; // Actual HP stat

            let metCondition = false;
            if (threshold === 'OHKO') {
                if (minDamage >= targetHP) metCondition = true;
            } else if (threshold === '2HKO') {
                if (minDamage * 2 >= targetHP) metCondition = true;
            } else if (threshold === '3HKO') {
                if (minDamage * 3 >= targetHP) metCondition = true;
            } else if (threshold === '4HKO') {
                if (minDamage * 4 >= targetHP) metCondition = true;
            }

            if (metCondition) {
                minEv = ev;
                high = mid - 1; // Try lower
            } else {
                low = mid + 1; // Need more power
            }
        }

        if (minEv !== -1) {
            // Get final stat
            const finalUser = JSON.parse(JSON.stringify(user));
            finalUser.evs[statKey] = minEv;
            const res = this.calc.calculateDamage(finalUser, target, move, isUserTera, isTargetTera, fieldArgs);

            return {
                success: true,
                evs: { [statKey]: minEv },
                stat: res.attacker.stats[statKey],
                description: `Min ${statKey.toUpperCase()} EV: ${minEv}`
            };
        }

        return { success: false, evs: {}, description: 'Cannot achieve threshold with 252 EV' };
    }


    // -------------------------------------------------------------------------
    // Defense: Find Min HP+Def/SpD for Next Threshold
    // -------------------------------------------------------------------------
    public findDefensiveLine(
        target: MetaPokemonVariant,
        user: UserPokemonConfig,
        move: string,
        category: 'Physical' | 'Special',
        isTargetTera: boolean = false,
        isUserTera: boolean = false,
        fieldArgs: any = {},
        mode: 'standard' | 'optimal' = 'standard'
    ): LineResult & { thresholdDesc?: string } {
        const defKey = category === 'Physical' ? 'def' : 'spd';

        // Pre-calculate baseline for fallback description
        const baselineUser = JSON.parse(JSON.stringify(user));
        baselineUser.evs.hp = 0;
        baselineUser.evs[defKey] = 0;
        const baselineRes = this.calc.calculateReceivedDamage(target, baselineUser, move, isTargetTera, isUserTera, fieldArgs);
        const baselineMaxDmg = baselineRes.range()[1];
        const baselineHP = baselineRes.defender.stats.hp;

        let baselineSurvivable = 0;
        if (baselineMaxDmg === 0) baselineSurvivable = 999;
        else baselineSurvivable = Math.ceil(baselineHP / baselineMaxDmg) - 1;

        let baselineDesc = '';
        if (baselineSurvivable >= 4) baselineDesc = '高耐久';
        else if (baselineSurvivable <= 0) baselineDesc = '確1';
        else if (baselineSurvivable === 1) baselineDesc = '確2';
        else baselineDesc = `確${baselineSurvivable + 1}`;

        // Helper to run search with specific nature (Optimized V2)
        const runSearch = (natureOverride?: string): LineResult & { thresholdDesc?: string } | null => {
            const currentNature = natureOverride || user.nature;

            // 1. Calculate Baseline (0 HP / 0 Def)
            const baseUser = JSON.parse(JSON.stringify(user));
            if (natureOverride) baseUser.nature = natureOverride;
            baseUser.evs.hp = 0;
            baseUser.evs[defKey] = 0;

            const baseRes = this.calc.calculateReceivedDamage(target, baseUser, move, isTargetTera, isUserTera, fieldArgs);
            const baseMaxDmg = baseRes.range()[1];
            const baseHP = baseRes.defender.stats.hp;

            let currentSurvivable = 0;
            if (baseMaxDmg === 0) currentSurvivable = 999;
            else currentSurvivable = Math.floor((baseHP - 1) / baseMaxDmg); // Hits to kill - 1 = Hits survivable? No. Using original logic: ceil(HP/Max) - 1.
            // Original: Math.ceil(baseHP / baseMaxDmg) - 1;
            // e.g. HP 100, Dmg 100 -> ceil(1) - 1 = 0 survivable (OHKO).
            // e.g. HP 101, Dmg 100 -> ceil(1.01) - 1 = 1 survivable (Survives 1 hit). Correct.
            currentSurvivable = Math.ceil(baseHP / baseMaxDmg) - 1;

            if (currentSurvivable >= 4) {
                return { success: false, evs: {}, description: 'Already highly durable', thresholdDesc: '高耐久' };
            }

            const targetSurvivable = currentSurvivable + 1; // +1 threshold
            let targetDesc = targetSurvivable === 1 ? '確定耐え' : `確定${targetSurvivable + 1}発`;

            // -----------------------------------------------------------------
            // OPTIMIZATION: Pre-calculate Damage Table (Def 0..63)
            // Damage received depends ONLY on Def Stat (and nature/evs), NOT on HP.
            // So we can calc damage for each Def EV once.
            // -----------------------------------------------------------------
            const damageTable: number[] = [];
            const defStatsTable: number[] = [];

            // We iterate 0..63 for Def EV
            for (let b = 0; b <= 63; b++) {
                const defEv = b * 4;
                // Use a minimal config for damage calc (HP doesn't matter for received damage amount)
                const testUser = JSON.parse(JSON.stringify(user));
                if (natureOverride) testUser.nature = natureOverride;
                testUser.evs[defKey] = defEv;
                testUser.evs.hp = 0; // Irrelevant for damage amount

                const res = this.calc.calculateReceivedDamage(target, testUser, move, isTargetTera, isUserTera, fieldArgs);
                damageTable[b] = res.range()[1]; // Max Damage
                defStatsTable[b] = res.defender.stats[defKey]; // Actual Def Stat
            }

            // -----------------------------------------------------------------
            // Search Valid Lines
            // Iterate HP 0..63. For each HP, find min Def from table.
            // -----------------------------------------------------------------
            let validResults: { hp: number, def: number, total: number, stat: number }[] = [];
            let minTotal = 9999;

            // Pre-calculate HP table to avoid re-running full calc?
            // HP only depends on Base HP, IV, EV. logic.ts has helper but we can run calcReceivedDamage once per HP?
            // Actually, we can just use the formula or run calc once. 
            // Running calc 64 times for HP is cheap if we don't care about damage range.
            // Or just check valid Def for each HP.

            for (let h = 0; h <= 63; h++) {
                const hpEv = h * 4;

                // Calculate Real HP for this EV
                // We can use the calc helper or just run one calc
                const hpUser = JSON.parse(JSON.stringify(user));
                hpUser.evs.hp = hpEv;
                // We need the HP stat.
                // Re-running full calc is overhead? 
                // We can cache the HP calc logic or use the calc instance. 
                // Let's strictly use the calc to be safe (it handles IVs/Base stats internally).
                // We can rely on `damageTable` for damage, so this call is just for HP.
                // Wait. calculateReceivedDamage also re-calcs damage.
                // We want to avoid that overhead if possible.
                // BUT `damageTable` is already calculated.
                // We only need the HP value.
                // Let's assume calculateReceivedDamage is consistent.

                // To get HP cheaply:
                // We can just inspect the result of `damageTable[0]`'s `res.defender`?
                // No, that had HP EV 0.
                // We need to know HP at EV `hpEv`.
                // Can we extrapolate? HP = Baseline + (hpEv/8)? No, at L50 it's +EV/4/2 + ...
                // Formula: floor((Base*2 + IV + EV/4) * 0.5) + 60 (Gen 9 L50 Rule: Base+60?)
                // Wait. logic.ts `calcRealStat` says: floor((Base*2 + IV + EV/4) * 50 / 100) + 50 + 10.
                // = floor((Base*2 + IV + EV/4) * 0.5) + 60.
                // Delta HP for +4 EV => +4/4 * 0.5 = 0.5. floor logic applies.
                // +8 EV => +1 HP.
                // So reliable formula is needed.
                // Let's run `calculateReceivedDamage` once per HP usage?
                // IF we trust the formula is standard, we can implement it here.
                // But `this.calc` handles dynamic Base Stats if we changed species.
                // Let's just run `calculateReceivedDamage` but ignore the move damage part? 
                // `calc` doesn't expose `getStats` public method easily?
                // Actually `DamageCalculator` wrapper usually runs full calc.
                // Optimization: Just calculate HP once per loop.
                // It is 64 calls. Total = 64 (Def Table) + 64 (HP Loop) = 128 calls.
                // Still better than 384.

                const resHP = this.calc.calculateReceivedDamage(target, hpUser, move, isTargetTera, isUserTera, fieldArgs);
                const userHP = resHP.defender.stats.hp;

                // Check condition: Damage * TargetSurvivable < userHP
                // We want min Def Index `b` such that damageTable[b] satisfies this.
                // damageTable is Sorted Descending (More Def = Less Damage).
                // We want the FIRST `b` (smallest Def) that fits.
                // We can simple linear scan `b` from 0?
                // Or since HP increases, required max damage is looser?
                // As HP increases, we can tolerate MORE damage.
                // So required Def decreases.

                // Let's use simple linear scan 0..63 for now, inside logical check.
                // Wait, if we scan 0..63 for every 64 HPs, that's 64*64 = 4096 checks (though fast checks).
                // It's just simple number comparison. Very fast.

                let neededDefEv = -1;
                let achievedStat = 0;

                for (let b = 0; b <= 63; b++) {
                    const dmg = damageTable[b];
                    if (dmg * targetSurvivable < userHP) {
                        neededDefEv = b * 4;
                        achievedStat = defStatsTable[b];
                        break; // Found smallest sufficient Def
                    }
                }

                if (neededDefEv !== -1) {
                    const total = hpEv + neededDefEv;
                    validResults.push({ hp: hpEv, def: neededDefEv, total: total, stat: achievedStat });
                    if (total < minTotal) minTotal = total;
                }
            }

            if (validResults.length > 0) {
                // Heuristic: "H-Main with B-flexibility"
                validResults.sort((a, b) => {
                    if (a.total !== b.total) return a.total - b.total;
                    return b.hp - a.hp; // Tiebreak: Prefer HP
                });
                const efficientResult = validResults[0];

                let bestResult;

                if (mode === 'optimal') {
                    // Efficiency Optimization
                    bestResult = efficientResult;
                } else {
                    // Standard Logic: Prioritize HP (H-Based) with flexibility for small Def usage
                    const defLimit = 20;
                    const hFocusedCandidates = validResults.filter(r => r.def <= defLimit);

                    if (hFocusedCandidates.length > 0) {
                        hFocusedCandidates.sort((a, b) => {
                            if (a.total !== b.total) return a.total - b.total;
                            return b.hp - a.hp;
                        });
                        bestResult = hFocusedCandidates[0];
                    } else {
                        validResults.sort((a, b) => b.hp - a.hp);
                        bestResult = validResults[0];
                    }
                }

                return {
                    success: true,
                    evs: { hp: bestResult.hp, [defKey]: bestResult.def },
                    stat: bestResult.stat,
                    nature: currentNature,
                    totalEvCost: bestResult.total,
                    description: `Min EVs (HP-Biased): H${bestResult.hp} / ${defKey === 'def' ? 'B' : 'D'}${bestResult.def} (Total: ${bestResult.total})`,
                    thresholdDesc: targetDesc,
                    efficientEvs: { hp: efficientResult.hp, [defKey]: efficientResult.def },
                    efficientTotal: efficientResult.total,
                    efficientStat: efficientResult.stat
                };
            }
            return null;
        };

        // Pass 1: Original Nature (Neutral Def usually)
        const res1 = runSearch();
        if (res1 && res1.success) return res1;
        if (res1 && res1.thresholdDesc === '高耐久') return res1;

        // Pass 2: Positive Nature (Bold / Calm)
        const positiveNature = category === 'Physical' ? 'Bold' : 'Calm';
        const res2 = runSearch(positiveNature);

        if (res2 && res2.success) return res2;
        if (res2 && res2.thresholdDesc === '高耐久') return res2;

        return { success: false, evs: {}, description: 'Cannot reach next threshold', thresholdDesc: baselineDesc };
    }
}

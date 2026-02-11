
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
    // Staged binary search approach for performance:
    //   Stage 1: BD={0,4,8,12}, binary search HP 0-252 (H-focused)
    //   Stage 2: H=252 fixed, binary search BD 16-252
    //   Stage 3: Nature boost + 252/252 check
    // -------------------------------------------------------------------------

    // Helper: check if a specific H/BD EV combo survives the target threshold
    private checkSurvives(
        target: MetaPokemonVariant, user: UserPokemonConfig, move: string,
        category: 'Physical' | 'Special', hpEv: number, defEv: number,
        targetSurvivable: number, isTargetTera: boolean, isUserTera: boolean,
        fieldArgs: any, natureOverride?: string
    ): { survives: boolean, hp: number, defStat: number } {
        const defKey = category === 'Physical' ? 'def' : 'spd';
        const testUser = JSON.parse(JSON.stringify(user));
        if (natureOverride) testUser.nature = natureOverride;
        testUser.evs.hp = hpEv;
        testUser.evs[defKey] = defEv;
        const res = this.calc.calculateReceivedDamage(target, testUser, move, isTargetTera, isUserTera, fieldArgs);
        const maxDmg = res.range()[1];
        const hp = res.defender.stats.hp;
        const defStat = res.defender.stats[defKey];
        return { survives: maxDmg * targetSurvivable < hp, hp, defStat };
    }

    public findDefensiveLine(
        target: MetaPokemonVariant,
        user: UserPokemonConfig,
        move: string,
        category: 'Physical' | 'Special',
        isTargetTera: boolean = false,
        isUserTera: boolean = false,
        fieldArgs: any = {}
    ): LineResult & { thresholdDesc?: string } {
        const defKey = category === 'Physical' ? 'def' : 'spd';

        // Calculate baseline (0 HP / 0 Def) to determine current survivability
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

        // Staged search with optional nature override
        const runSearch = (natureOverride?: string): LineResult & { thresholdDesc?: string } | null => {
            const currentNature = natureOverride || user.nature;

            // Baseline for this nature
            const baseCheck = this.checkSurvives(target, user, move, category, 0, 0, 1, isTargetTera, isUserTera, fieldArgs, natureOverride);
            const baseRes2 = this.calc.calculateReceivedDamage(target, (() => {
                const u = JSON.parse(JSON.stringify(user));
                if (natureOverride) u.nature = natureOverride;
                u.evs.hp = 0; u.evs[defKey] = 0;
                return u;
            })(), move, isTargetTera, isUserTera, fieldArgs);
            const baseMaxDmg = baseRes2.range()[1];
            const baseHP = baseRes2.defender.stats.hp;

            if (baseMaxDmg === 0) return { success: false, evs: {}, description: 'Already highly durable', thresholdDesc: '高耐久' };

            const currentSurvivable = Math.ceil(baseHP / baseMaxDmg) - 1;
            if (currentSurvivable >= 4) {
                return { success: false, evs: {}, description: 'Already highly durable', thresholdDesc: '高耐久' };
            }

            const targetSurvivable = currentSurvivable + 1;
            const targetDesc = targetSurvivable === 1 ? '確定耐え' : `確定${targetSurvivable + 1}発`;

            type Candidate = { hp: number, def: number, total: number, stat: number };
            let bestResult: Candidate | null = null;
            let efficientResult: Candidate | null = null;

            // Helper: binary search HP for a fixed BD value
            const bsearchHP = (fixedDef: number): Candidate | null => {
                // Quick check: does H252+fixedDef work?
                const maxCheck = this.checkSurvives(target, user, move, category, 252, fixedDef, targetSurvivable, isTargetTera, isUserTera, fieldArgs, natureOverride);
                if (!maxCheck.survives) return null;

                // Quick check: does H0+fixedDef work?
                const minCheck = this.checkSurvives(target, user, move, category, 0, fixedDef, targetSurvivable, isTargetTera, isUserTera, fieldArgs, natureOverride);
                if (minCheck.survives) return { hp: 0, def: fixedDef, total: fixedDef, stat: minCheck.defStat };

                // Binary search for minimum HP
                let low = 1, high = 63, minH = 63;
                while (low <= high) {
                    const mid = Math.floor((low + high) / 2);
                    const hpEv = mid * 4;
                    const check = this.checkSurvives(target, user, move, category, hpEv, fixedDef, targetSurvivable, isTargetTera, isUserTera, fieldArgs, natureOverride);
                    if (check.survives) {
                        minH = mid;
                        high = mid - 1;
                    } else {
                        low = mid + 1;
                    }
                }
                const hpEv = minH * 4;
                const finalCheck = this.checkSurvives(target, user, move, category, hpEv, fixedDef, targetSurvivable, isTargetTera, isUserTera, fieldArgs, natureOverride);
                return { hp: hpEv, def: fixedDef, total: hpEv + fixedDef, stat: finalCheck.defStat };
            };

            // Helper: binary search BD for fixed HP=252
            const bsearchDef = (lowDef: number, highDef: number): Candidate | null => {
                const lowIdx = Math.ceil(lowDef / 4);
                const highIdx = Math.floor(highDef / 4);

                // Quick check: does max BD work?
                const maxCheck = this.checkSurvives(target, user, move, category, 252, highIdx * 4, targetSurvivable, isTargetTera, isUserTera, fieldArgs, natureOverride);
                if (!maxCheck.survives) return null;

                let lo = lowIdx, hi = highIdx, minD = highIdx;
                while (lo <= hi) {
                    const mid = Math.floor((lo + hi) / 2);
                    const defEv = mid * 4;
                    const check = this.checkSurvives(target, user, move, category, 252, defEv, targetSurvivable, isTargetTera, isUserTera, fieldArgs, natureOverride);
                    if (check.survives) {
                        minD = mid;
                        hi = mid - 1;
                    } else {
                        lo = mid + 1;
                    }
                }
                const defEv = minD * 4;
                const finalCheck = this.checkSurvives(target, user, move, category, 252, defEv, targetSurvivable, isTargetTera, isUserTera, fieldArgs, natureOverride);
                return { hp: 252, def: defEv, total: 252 + defEv, stat: finalCheck.defStat };
            };

            // ---- Stage 1: H-focused search with BD capped at 12 ----
            const bdCaps = [0, 4, 8, 12];
            for (const bd of bdCaps) {
                const result = bsearchHP(bd);
                if (result) {
                    if (!efficientResult || result.total < efficientResult.total) {
                        efficientResult = result;
                    }
                    // H-focused: prefer low BD
                    if (!bestResult || result.total < bestResult.total || (result.total === bestResult.total && result.hp > bestResult.hp)) {
                        bestResult = result;
                    }
                }
            }

            // ---- Stage 2: H=252 fixed, BD 16-252 search ----
            if (!bestResult) {
                const result = bsearchDef(16, 252);
                if (result) {
                    bestResult = result;
                    if (!efficientResult || result.total < efficientResult.total) {
                        efficientResult = result;
                    }
                }
            }

            if (bestResult && efficientResult) {
                const defLabel = defKey === 'def' ? 'B' : 'D';
                return {
                    success: true,
                    evs: { hp: bestResult.hp, [defKey]: bestResult.def },
                    stat: bestResult.stat,
                    nature: currentNature,
                    totalEvCost: bestResult.total,
                    description: `Min EVs (HP-Biased): H${bestResult.hp} / ${defLabel}${bestResult.def} (Total: ${bestResult.total})`,
                    thresholdDesc: targetDesc,
                    efficientEvs: { hp: efficientResult.hp, [defKey]: efficientResult.def },
                    efficientTotal: efficientResult.total,
                    efficientStat: efficientResult.stat
                };
            }
            return null;
        };

        // Pass 1: Original Nature
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

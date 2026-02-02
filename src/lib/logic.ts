
import { DamageCalculator } from '@/core/calculator';
import { MetaPokemons } from '@/data/meta_pokemons';
import { UserPokemonConfig, MetaPokemonVariant, CalculationSettings, VariantFilterMode } from '@/types';
import { t, translateText } from '@/core/translator';
import { LineExplorer } from '@/core/lineExplorer';
import { AbilityBranches } from '@/data/ability_branches';
import * as calcLib from '@smogon/calc';

// Helper: Calculate Level 50 Stat - Refactored to use dynamic species
function calcRealStatWithBase(base: number, ev: number, iv: number = 31, natureMult: number = 1.0, isHp: boolean = false): number {
    if (isHp) {
        return Math.floor((base * 2 + iv + Math.floor(ev / 4)) * 50 / 100) + 50 + 10;
    } else {
        const val = Math.floor((base * 2 + iv + Math.floor(ev / 4)) * 50 / 100) + 5;
        return Math.floor(val * natureMult);
    }
}

// Helper: Format Value
const formatVal = (val: string) => (!val || val === 'undefined') ? '-' : val;

// Helper: Filter Logic
const isInactiveLabel = (label: string) => {
    if (!label) return false;
    const inactiveKeywords = ['(Inactive)', '(No ', '(なし)', '(未発動)', '(つぶれ)', '(Broken)'];
    // Note: 'No ' covers 'No Intimidate', 'No Sand', etc.
    return inactiveKeywords.some(k => label.includes(k));
};

const filterVariantsByMode = (variants: any[], mode: VariantFilterMode, getLabel: (v: any) => string) => {
    if (mode === 'default') return variants;

    // Group by base species/identity to handle fallback?
    // User variants are generated from branches.
    // Opponents are flat list.
    // This helper is generic.

    if (mode === 'active-only') {
        return variants.filter(v => !isInactiveLabel(getLabel(v)));
    }
    if (mode === 'inactive-only') {
        const filtered = variants.filter(v => isInactiveLabel(getLabel(v)));
        return filtered.length > 0 ? filtered : variants; // Fallback to base if no inactive variant exists
    }
    return variants;
};

// ... deduplicateResults ... (unchanged)
export function deduplicateResults(results: any[], uniqueKeys: string[]): any[] {
    const seen = new Set<string>();
    return results.filter(row => {
        const signatureParts = uniqueKeys.map(k => {
            if (k === '相手テラスタル' || k === '自分テラスタル' || k === '状況' || k === '詳細') return '';
            return String(row[k] || '');
        });
        const signature = signatureParts.join('|');
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
    });
}
// ... filterRedundantSameResult ... (unchanged - referencing lines 38-107)
export function filterRedundantSameResult(results: any[]): any[] {
    const groups = new Map<string, any[]>();
    const labelsToStrip = [
        '(特化)', '(準特化)', '(4振り)',
        '(GF)', '(EF)', '(PF)',
        '(Sun)', '(Rain)', '(Sand)', '(Snow)',
        '(Sun+Boost)', '(Rain+Boost)', '(EF+Boost)', '(PF+Boost)',
        '(Intimidate)', '(No Intimidate)', '(Active)', '(Inactive)',
        '(No Field)', '(No Sun)', '(No Rain)',
        '(発動)', '(MF)'
    ];

    for (const row of results) {
        let speciesBase = row['相手'];
        for (const label of labelsToStrip) {
            speciesBase = speciesBase.split(label).join('');
        }
        speciesBase = speciesBase.trim();
        // Group by Name, Move, AND Damage (as requested by user)
        // usage of _meta.minDmg ensures different outcomes are kept.
        const key = `${speciesBase}|${row['技']}|${row['_meta']?.minDmg}`;

        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(row);
    }

    const finalRows: any[] = [];
    for (const [key, rows] of groups) {
        const evGroups = new Map<number, any[]>();
        for (const r of rows) {
            const total = Number(r['合計EV'] || 0);
            if (!evGroups.has(total)) {
                evGroups.set(total, []);
            }
            evGroups.get(total)!.push(r);
        }

        for (const [ev, sameResultRows] of evGroups) {
            if (sameResultRows.length === 1) {
                finalRows.push(sameResultRows[0]);
            } else {
                sameResultRows.sort((a, b) => {
                    const getPenalty = (row: any) => {
                        let penalty = 0;
                        if (row['場の状態'] && row['場の状態'] !== '-') penalty += 1000;
                        if (row['自分テラスタル'] && row['自分テラスタル'] !== '-') penalty += 500;
                        if (row['相手テラスタル'] && row['相手テラスタル'] !== '-') penalty += 100;
                        const priorityOrder = ['(特化)', '(準特化)', '(4振り)', ''];
                        const name = row['相手'];
                        let pIndex = 99;
                        for (let i = 0; i < priorityOrder.length; i++) {
                            if (name.includes(priorityOrder[i])) {
                                pIndex = i;
                                break;
                            }
                        }
                        penalty += pIndex;
                        return penalty;
                    };
                    return getPenalty(a) - getPenalty(b);
                });
                finalRows.push(sameResultRows[0]);
            }
        }
    }
    return finalRows;
}

import { GlobalFieldState } from '@/types';

export async function calculateDamageForConfig(baseUserPoke: UserPokemonConfig, globalField?: GlobalFieldState, opponentOverrides?: UserPokemonConfig[], settings?: CalculationSettings) {
    const calc = new DamageCalculator();
    const explorer = new LineExplorer();
    const gen = 9;
    const baseFieldArgs: any = { isSpreadDamage: globalField?.global?.isSpreadDamage ?? true }; // Placeholder for future manual field config

    // Prepare Targets (Opponents)
    // If opponentsList (formerly opponentOverrides) is provided, use it directly.
    // The frontend is now responsible for combining Defaults + Customs and handling Labels.
    let fullTargets: any[] = opponentOverrides && opponentOverrides.length > 0
        ? opponentOverrides
        : [...MetaPokemons];

    // Filter Targets based on Variant Mode (Ability)
    // Need to group by "Base Species" to apply Fallback logic correctly?
    // Or just filter naively. Logic: "inactive-only" keeps Inactives. If no Inactive, keep Base.
    // "Base" is defined by... having same species?
    // MetaPokemons come in blocks.
    // Simplest: Filter. If list becomes empty, user gets nothing - BAD.
    // Fallback logic in `filterVariantsByMode` expects an array of variants for ONE entity.
    // Here we have an array of ALL entities.
    // We should group by ID or Species to apply filter per-Pokemon.
    // IDs are present in MetaPokemons/Overrides.

    const settingsAbilityMode = settings?.abilityVariantMode || 'default';

    let targets: any[] = [];
    if (settingsAbilityMode === 'default') {
        targets = fullTargets;
    } else {
        const grouped = new Map<string, any[]>();
        for (const t of fullTargets) {
            // Group by Species Name (approximate grouping for variants)
            // Or use ID if available? MetaPokemons have IDs.
            // But we want to group "Landorus-T" and "Landorus-T (Intimidate)" together.
            const key = t.species;
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(t);
        }

        for (const [key, group] of grouped) {
            const filtered = filterVariantsByMode(group, settingsAbilityMode, (v) => v.extraLabel || (v.customLabel ? `(${v.customLabel})` : '') || '');
            targets.push(...filtered);
        }
    }

    const userSpeciesTranslated = t(baseUserPoke.species);
    console.log(`[DEBUG] Calculating for ${baseUserPoke.species}`);

    // Fetch Base Stats dynamically
    const dummyPoke = new (calcLib.Pokemon)(calcLib.Generations.get(gen), baseUserPoke.species);
    let baseStats = (dummyPoke as any).bs;
    if (!baseStats && dummyPoke.species) {
        baseStats = (dummyPoke.species as any).bs || (dummyPoke.species as any).baseStats;
    }
    if (!baseStats) {
        throw new Error(`Could not find base stats for ${baseUserPoke.species}`);
    }

    // Internal helper to use CURRENT pokemon's base stats
    const calcStat = (stat: 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', ev: number, iv: number = 31, natureMult: number = 1.0): number => {
        const isHp = stat === 'hp';
        const base = baseStats[stat];
        return calcRealStatWithBase(base, ev, iv, natureMult, isHp);
    };


    // Define User Variants using AbilityBranches
    const generateUserVariants = (user: UserPokemonConfig) => {
        const branchFn = AbilityBranches[user.ability];
        if (!branchFn) {
            // Default Case: Protosynthesis/Quark Drive check for Item
            // If No Item/Field, they are Inactive.
            // If User has Booster Energy, we should probably just return a standard variant?
            // Protosynthesis/Quark Drive rely on run-time check in checkParadox.
            // But if we want to show 'Active' status in UI like 'Orichalcum Pulse', we might need to be clever.
            // However, Orichalcum Pulse SETS field. Proto/Quark RESPOND to it.
            // For now, return default.
            if (baseUserPoke.species === 'Tornadus') {
                return [
                    { label: '', overrides: {} },
                    { label: '(襷)', overrides: { item: 'Focus Sash' } }
                ];
            }
            return [{ label: '', overrides: {} }];
        }

        const baseVariant: MetaPokemonVariant = {
            species: user.species,
            item: user.item,
            nature: user.nature,
            ability: user.ability,
            evs: user.evs,
            moves: user.moves,
            teraType: user.teraType
        };

        const branches = branchFn(baseVariant);
        return branches.map(b => {
            // Map MetaPokemonVariant back to { label, overrides } structure
            // The overrides needed are: forcedField (handled in loop), boosts, overrides (abilityOn)
            // We need to pass 'forcedField' to the loop
            return {
                label: b.extraLabel || '',
                forcedField: b.forcedField,
                overrides: {
                    overrides: b.overrides || {}, // abilityOn etc
                    boosts: (b as any).boosts,
                    status: (b as any).overrides?.status // Handling status manually or via overrides?
                }
            };
        });
    };

    let userVariants: { label: string, overrides: any, forcedField?: any }[] = generateUserVariants(baseUserPoke);
    userVariants = filterVariantsByMode(userVariants, settings?.abilityVariantMode || 'default', (v) => v.label);


    const RELEVANT_ABILITIES = new Set([
        // Offensive
        'Protosynthesis', 'Quark Drive', 'Hadron Engine', 'Orichalcum Pulse',
        'Sword of Ruin', 'Beads of Ruin', 'Intrepid Sword', 'Transistor', 'Dragon\'s Maw',
        'Rocky Payload', 'Steelworker', 'Sharpness', 'Supreme Overlord', 'Protean', 'Libero',
        'Adaptability', 'Technician', 'Sheer Force', 'Tough Claws', 'Sniper', 'Tinted Lens',
        'Reckless', 'Guts', 'Toxic Boost', 'Flare Boost', 'Flash Fire', 'Solar Power',
        'Sand Force', 'Punk Rock', 'Stakeout', 'Analytic', 'Huge Power', 'Pure Power',
        'Gorilla Tactics', 'Hustle', 'Defiant', 'Competitive', 'Moxie', 'Soul-Heart',
        'Beast Boost', 'Grim Neigh', 'Chilling Neigh', 'Download', 'Aerilate', 'Pixilate', 'Refrigerate', 'Galvanize',
        'Mega Launcher', 'Strong Jaw', 'Fur Coat', 'Ice Scales', 'Fluffy', 'Multiscale', 'Shadow Shield',
        'Prism Armor', 'Filter', 'Solid Rock', 'Wonder Guard', 'Levitate', 'Earth Eater', 'Volt Absorb',
        'Water Absorb', 'Sap Sipper', 'Lightning Rod', 'Storm Drain', 'Dry Skin', 'Heatproof', 'Thick Fat',
        'Purifying Salt', 'Well-Baked Body', 'Good as Gold', 'Magic Guard', 'Unaware',
        // Weather/Terrain
        'Drought', 'Drizzle', 'Sand Stream', 'Snow Warning', 'Grassy Surge', 'Electric Surge', 'Misty Surge', 'Psychic Surge',
        // Notable
        'Intimidate', 'Slow Start', 'Defeatist',
        // Berry Prevention
        'Unnerve', 'As One (Glastrier)', 'As One (Spectrier)'
    ]);

    const getDisplayAbility = (ability: string, extraLabel: string, item: string | undefined, weather: string | undefined, terrain: string | undefined) => {
        // 1. Check Explicit Inactive Labels
        if (extraLabel && (
            extraLabel.includes('Inactive') || extraLabel.includes('未発動') ||
            extraLabel.includes('No ') || extraLabel.includes('なし') ||
            extraLabel.includes('Broken')
        )) {
            return '-';
        }

        // 2. Check Specific Activation Logic for Implicit Abilities (Proto/Quark)
        if (ability === 'Protosynthesis') {
            const isActive = item === 'Booster Energy' || weather === 'Sun' || weather === 'Harsh Sunshine';
            return isActive ? t('Protosynthesis') : '-';
        }
        if (ability === 'Quark Drive') {
            const isActive = item === 'Booster Energy' || terrain === 'Electric';
            return isActive ? t('Quark Drive') : '-';
        }

        // 3. Check Relevance Whitelist
        // We check English name (ability) against Set
        // Note: 'ability' arg might be Japanese if already translated?
        // The calling code passes `effectiveAttacker.ability` which is usually English from Calc.
        // But `t()` maps it.
        // Logic: If we can't find it in Relevant Set, assume irrelevant.
        // But we need to handle case where 'ability' is '-' or empty.
        if (!ability || ability === '-') return '-';

        if (RELEVANT_ABILITIES.has(ability)) {
            return t(ability);
        }

        // Default: Hidden
        return '-';
    };

    // ... existing code ...



    let attackResults: any[] = []; // Changed to let to allow reassignment/filtering
    const physDefResults: any[] = [];
    const specDefResults: any[] = [];
    const physDefLineResults: any[] = [];
    const specDefLineResults: any[] = [];
    const offensiveLines: any[] = [];

    // Identify Main Move (First move with BP >= 60)
    let mainMove = baseUserPoke.moves[0];
    for (const m of baseUserPoke.moves) {
        if (!m || m === '(No Move)') continue;
        const tempRes = calc.calculateDamage(baseUserPoke, MetaPokemons[0], m, false, false, { gameType: 'Doubles' });
        if (tempRes.move.bp >= 60) {
            mainMove = m;
            break;
        }
    }

    // Helper: Smart Berry Deduplication Helper
    const calculateBerryAdjustedKO = (result: any, minDmg: number, maxDmg: number) => {
        let ko: { n: number, chance?: number, text: string } = { n: 0, chance: 0, text: '' };
        if (maxDmg > 0) {
            if (result.kochance) {
                ko = result.kochance();
            }
        }

        // Check for Unnerve / As One (Attacker prevents Defender from eating)
        const attackerAbility = result.attacker.ability || '';
        if (attackerAbility === 'Unnerve' || attackerAbility.startsWith('As One')) {
            return ko;
        }

        const defenderItem = result.defender.item;

        // Berry Config
        let berryRecovery = 0;
        let berryThreshold = 0;
        let berryName = '';

        const sitrus = ['Sitrus Berry', 'オボンのみ'];
        const pinchBerries = [
            'Figy Berry', 'Wiki Berry', 'Mago Berry', 'Aguav Berry', 'Iapapa Berry',
            'フィラのみ', 'ウイのみ', 'マゴのみ', 'バンジのみ', 'イアのみ'
        ];

        if (sitrus.includes(defenderItem)) {
            berryName = 'Sitrus Berry';
            berryRecovery = 1 / 4;
            berryThreshold = 1 / 2;
        } else if (pinchBerries.includes(defenderItem)) {
            berryName = 'Pinch Berry';
            berryRecovery = 1 / 3;
            // Check Gluttony
            const ability = result.defender.ability;
            const hasGluttony = ability === 'Gluttony' || ability === 'くいしんぼう';
            berryThreshold = hasGluttony ? 1 / 2 : 1 / 4;
        }

        if (berryRecovery > 0) {
            const hp = result.defender.stats.hp;
            const recoveryAmount = Math.floor(hp * berryRecovery);
            const thresholdAmount = Math.floor(hp * berryThreshold);

            const simulateHits = (dmg: number) => {
                let currentHP = hp;
                let consumed = false;
                for (let i = 1; i <= 9; i++) { // Cap at 9 hits
                    currentHP -= dmg;
                    if (currentHP <= 0) return { hits: i, consumed };
                    if (!consumed && currentHP <= thresholdAmount) {
                        currentHP += recoveryAmount;
                        consumed = true;
                        if (currentHP > hp) currentHP = hp; // Cap at max HP? Usually berries don't overfill, logic is fine.
                    }
                }
                return { hits: 9, consumed };
            };

            const minSim = simulateHits(minDmg);
            const maxSim = simulateHits(maxDmg);

            let baseText = '';
            if (minSim.hits === maxSim.hits) {
                baseText = `guaranteed ${minSim.hits}HKO`;
            } else {
                baseText = `chance to ${maxSim.hits}HKO`;
            }

            if (minSim.consumed || maxSim.consumed) {
                // Determine label
                const label = berryName === 'Sitrus Berry' ? 'Sitrus Berry' : defenderItem; // Use specific name for 1/3
                // Simple suffix check in translator will handle "after Sitrus Berry recovery" -> "(オボン込)"
                // We need to ensure translator handles others.
                // Or we can just append generic string and let translator handle keys.
                // Existing translator has specific key: "after Sitrus Berry recovery": "(オボン込)"

                if (berryName === 'Sitrus Berry') {
                    baseText += ' after Sitrus Berry recovery';
                } else {
                    // For pinch berries, we might not have a specific sentence key.
                    // Let's rely on "after item recovery" pattern if possible?
                    // Or add specific replacements in translator.ts
                    // logic.ts passes English "after X recovery" usually.
                    baseText += ` after ${defenderItem} recovery`;
                }
            }

            ko.text = baseText;
            ko.n = maxSim.hits;
        }
        return ko;
    };

    // Helper: Smart Deduplication (Shared Logic)
    // Groups by: Move + Species + Damage Outcome
    // Filters: Prefer Non-Tera, Shorter Labels
    const smartDeduplicate = (results: any[]) => {
        const groupedResults = new Map<string, any[]>();
        for (const r of results) {
            // Unique Key: Move | Species | MinDmg | MaxDmg | KillDesc
            const key = `${r['技']}|${r['_meta'].species}|${r['_meta'].minDmg}|${r['_meta'].maxDmg}|${r['確定数']}`;
            if (!groupedResults.has(key)) {
                groupedResults.set(key, []);
            }
            groupedResults.get(key)!.push(r);
        }

        const deduped: any[] = [];
        for (const [key, group] of groupedResults) {
            if (group.length === 1) {
                deduped.push(group[0]);
            } else {
                group.sort((a, b) => {
                    let scoreA = 0;
                    let scoreB = 0;

                    // Penalty for Tera
                    if (a['_meta'].userTera) scoreA += 10;
                    if (b['_meta'].userTera) scoreB += 10;
                    if (a['_meta'].attackerTera) scoreA += 10; // For Defense (Attacker is Opponent)
                    if (b['_meta'].attackerTera) scoreB += 10;
                    if (a['_meta'].defenderTera) scoreA += 10; // For Attack (Defender is Opponent)
                    if (b['_meta'].defenderTera) scoreB += 10;

                    // Secondary: Label Length (Shorter preferred)
                    if (scoreA === scoreB) {
                        const labelA = a['自分特性'] || a['相手特性'] || a['特性'] || a['相手'] || '';
                        const labelB = b['自分特性'] || b['相手特性'] || b['特性'] || b['相手'] || '';

                        // If one label contains '(発動)' and the other doesn't, we can explicitly penalize it.
                        // But length check usually handles it: 'Name (発動)' > 'Name'.
                        const lenA = labelA.length;
                        const lenB = labelB.length;

                        // Explicit penalty for '発動' or 'Active' if damage is same
                        const isActiveA = labelA.includes('(発動)') || labelA.includes('(Active)');
                        const isActiveB = labelB.includes('(発動)') || labelB.includes('(Active)');
                        if (isActiveA && !isActiveB) return 1; // A is worse (Active when Inactive matches)
                        if (!isActiveA && isActiveB) return -1; // B is worse

                        return lenA - lenB;
                    }
                    return scoreA - scoreB;
                });
                deduped.push(group[0]);
            }
        }

        // Clean up _meta - REMOVED: needed for Phase 3 Line Calc
        // We will return the results with _meta included.
        return deduped;
    };

    // =========================================================================
    // MAIN LOOP: Iterate over User Variants (PHASE 1: Basic Calc)
    // =========================================================================
    for (const variant of userVariants) {
        const userPoke = JSON.parse(JSON.stringify(baseUserPoke));
        if (variant.overrides) {
            Object.assign(userPoke, variant.overrides);
            if (variant.overrides.overrides) Object.assign(userPoke.overrides, variant.overrides.overrides);
        }

        // Apply User Stat Ranks (Manual) - Added v2.5
        if (baseUserPoke.ranks) {
            if (!userPoke.boosts) userPoke.boosts = {};
            // Merge Ranks: Manual Base + Variant Boosts (if any)?
            // User requested Manual Ranks. We treat them as base boosts.
            // Existing variant boosts (e.g. from item triggers or whatever) presumably add to it or overwrite?
            // Let's merge: Manual + Variant.
            // But wait, user said "A+2 exposed to Intimidate becomes A+1".
            // Variant logic (handled later/below) usually modifies this.
            // Intimidate logic is specific.
            // Helper: Merge boosts safely
            const r = baseUserPoke.ranks;
            userPoke.boosts.atk = (userPoke.boosts.atk || 0) + (r.atk || 0);
            userPoke.boosts.def = (userPoke.boosts.def || 0) + (r.def || 0);
            userPoke.boosts.spa = (userPoke.boosts.spa || 0) + (r.spa || 0);
            userPoke.boosts.spd = (userPoke.boosts.spd || 0) + (r.spd || 0);
            userPoke.boosts.spe = (userPoke.boosts.spe || 0) + (r.spe || 0);
        }

        let userScenarios = [{ isTera: false, label: '' }];
        if (userPoke.teraType) userScenarios.push({ isTera: true, label: ` (テラ: ${t(userPoke.teraType || '')})` });

        // Filter Tera
        const settingsTeraMode = settings?.teraVariantMode || 'default';
        if (settingsTeraMode === 'active-only') {
            userScenarios = userScenarios.filter(s => s.isTera);
        } else if (settingsTeraMode === 'inactive-only') {
            userScenarios = userScenarios.filter(s => !s.isTera);
        }

        const variantLabel = variant.label;

        // -------------------------------------------------------------------------
        // 1. Offense (Attack)
        // -------------------------------------------------------------------------
        for (const userScenario of userScenarios) {
            for (const defender of targets) {
                let defenderScenarios = [{ isTera: false, label: '' }];
                if (defender.teraType) defenderScenarios.push({ isTera: true, label: ` (テラ: ${t(defender.teraType || '')})` });

                if (settingsTeraMode === 'active-only') {
                    defenderScenarios = defenderScenarios.filter(s => s.isTera);
                } else if (settingsTeraMode === 'inactive-only') {
                    defenderScenarios = defenderScenarios.filter(s => !s.isTera);
                }

                for (const defenderScenario of defenderScenarios) {
                    for (const move of userPoke.moves) {
                        if (!move) continue;

                        // Clone defender to apply Global Opponent Ranks calculations
                        const effectiveDefender = JSON.parse(JSON.stringify(defender));
                        if (globalField && globalField.opponentRanks) {
                            if (!effectiveDefender.boosts) effectiveDefender.boosts = {};
                            const r = globalField.opponentRanks;
                            effectiveDefender.boosts.atk = (effectiveDefender.boosts.atk || 0) + (r.atk || 0);
                            effectiveDefender.boosts.def = (effectiveDefender.boosts.def || 0) + (r.def || 0);
                            effectiveDefender.boosts.spa = (effectiveDefender.boosts.spa || 0) + (r.spa || 0);
                            effectiveDefender.boosts.spd = (effectiveDefender.boosts.spd || 0) + (r.spd || 0);
                            effectiveDefender.boosts.spe = (effectiveDefender.boosts.spe || 0) + (r.spe || 0);
                        }

                        // Field Setup
                        const fieldArgs: any = { ...baseFieldArgs, gameType: 'Doubles' };

                        // Apply Global Field State (v2.4)
                        if (globalField) {
                            // 1. Global Ruins
                            if (globalField.global.isSwordOfRuin) fieldArgs.isSwordOfRuin = true;
                            if (globalField.global.isBeadsOfRuin) fieldArgs.isBeadsOfRuin = true;
                            if (globalField.global.isTabletsOfRuin) fieldArgs.isTabletsOfRuin = true;
                            if (globalField.global.isVesselOfRuin) fieldArgs.isVesselOfRuin = true;

                            // 2. Side Logic (Context: User is Attacker, Opponent is Defender)
                            // User Side -> Attacker Side
                            fieldArgs.attackerSide = {
                                isHelpingHand: globalField.userSide.isHelpingHand,
                                isReflect: globalField.userSide.isReflect,
                                isLightScreen: globalField.userSide.isLightScreen,
                                isFriendGuard: globalField.userSide.isFriendGuard
                            };

                            // Opponent Side -> Defender Side
                            fieldArgs.defenderSide = {
                                isReflect: globalField.opponentSide.isReflect,
                                isLightScreen: globalField.opponentSide.isLightScreen,
                                isFriendGuard: globalField.opponentSide.isFriendGuard
                            };

                            // 3. Weather & Terrain (Priority: Manual > Variant)
                            if (globalField.weather && globalField.weather !== 'None') fieldArgs.weather = globalField.weather;
                            if (globalField.terrain && globalField.terrain !== 'None') fieldArgs.terrain = globalField.terrain;
                        }

                        if (defender.forcedField) {
                            if (!fieldArgs.weather && defender.forcedField.weather) fieldArgs.weather = defender.forcedField.weather;
                            // Note: Attack context usually cares about terrain for damage mods (e.g. Psyspam)
                            if (!fieldArgs.terrain && defender.forcedField.terrain) fieldArgs.terrain = defender.forcedField.terrain;
                        } else if (!fieldArgs.terrain && defender.species === 'Rillaboom' && !defender.extraLabel) {
                            fieldArgs.terrain = 'Grassy';
                        }



                        // User Field Setters (Orichalcum Pulse, Hadron Engine, Surges, etc.)
                        // Now handled via variant.forcedField
                        if (variant.forcedField) {
                            if (!fieldArgs.weather && variant.forcedField.weather) fieldArgs.weather = variant.forcedField.weather;
                            if (!fieldArgs.terrain && variant.forcedField.terrain) fieldArgs.terrain = variant.forcedField.terrain;
                        }

                        // INTIMIDATE LOGIC
                        let effectiveUser = userPoke;
                        const isIntimidateActive = (defender.forcedField && defender.forcedField.isDefenderIntimidated) ||
                            (defender.extraLabel && defender.extraLabel.includes('Intimidate') && !defender.extraLabel.includes('No Intimidate'));

                        if (isIntimidateActive) {
                            effectiveUser = JSON.parse(JSON.stringify(userPoke));
                            if (!effectiveUser.boosts) effectiveUser.boosts = {};
                            const userAbility = effectiveUser.ability;
                            const userItem = effectiveUser.item;
                            if (userAbility === 'Defiant') effectiveUser.boosts.atk = (effectiveUser.boosts.atk || 0) + 1;
                            else if (userAbility === 'Competitive') effectiveUser.boosts.spa = (effectiveUser.boosts.spa || 0) + 2;
                            else if (userAbility === 'Clear Body' || userItem === 'Clear Amulet' || userAbility === 'Full Metal Body') { }
                            else if (userAbility === 'Hyper Cutter' && true) { }
                            else effectiveUser.boosts.atk = (effectiveUser.boosts.atk || 0) - 1;
                        }

                        // PROTOSYNTHESIS / QUARK DRIVE LOGIC
                        // 1. Determine Highest Stat (Attacker)
                        const getHighestStat = (stats: any, nature: string, evs: any, ability: string): 'atk' | 'def' | 'spa' | 'spd' | 'spe' => {
                            const getMult = (n: string, s: string) => {
                                const plus: any = { 'Adamant': 'atk', 'Modest': 'spa', 'Jolly': 'spe', 'Timid': 'spe', 'Bold': 'def', 'Impish': 'def', 'Calm': 'spd', 'Careful': 'spd' };
                                const minus: any = { 'Modest': 'atk', 'Timid': 'atk', 'Adamant': 'spa', 'Jolly': 'spa' };
                                if (plus[n] === s) return 1.1;
                                if (minus[n] === s) return 0.9;
                                return 1.0;
                            };
                            const calcS = (base: number, ev: number, s: string) => Math.floor((Math.floor((base * 2 + 31 + Math.floor(ev / 4)) * 50 / 100) + 5) * getMult(nature, s));

                            // Note: We use the baseStats captured in closure `baseStats` or fetch dynamically if needed.
                            // But `userPoke` has no stats yet, only config. Need to calc for `userPoke`.
                            // `calcStat` function in scope is for current User Config.
                            const sAtk = calcStat('atk', evs.atk, 31, getMult(nature, 'atk'));
                            const sDef = calcStat('def', evs.def, 31, getMult(nature, 'def'));
                            const sSpA = calcStat('spa', evs.spa, 31, getMult(nature, 'spa'));
                            const sSpD = calcStat('spd', evs.spd, 31, getMult(nature, 'spd'));
                            const sSpe = calcStat('spe', evs.spe, 31, getMult(nature, 'spe'));

                            // Tiebreaker: Atk > Def > SpA > SpD > Spe
                            if (sAtk >= sDef && sAtk >= sSpA && sAtk >= sSpD && sAtk >= sSpe) return 'atk';
                            if (sDef >= sSpA && sDef >= sSpD && sDef >= sSpe) return 'def';
                            if (sSpA >= sSpD && sSpA >= sSpe) return 'spa';
                            if (sSpD >= sSpe) return 'spd';
                            return 'spe';
                        };

                        const checkParadox = (poke: any, field: any) => {
                            const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                            const ability = normalize(poke.ability);
                            const item = normalize(poke.item);

                            // Check explicit override
                            let explicitActive = poke.overrides?.abilityOn === true;
                            let active = explicitActive;

                            console.log(`[DEBUG] checkParadox: Species=${poke.species}, Ability=${poke.ability}, Item=${poke.item}, Override=${explicitActive}`);

                            if (ability === 'protosynthesis') {
                                if (item === 'boosterenergy' || field.weather === 'Sun' || field.weather === 'Harsh Sunshine') active = true;
                            } else if (ability === 'quarkdrive') {
                                if (item === 'boosterenergy' || field.terrain === 'Electric') active = true;
                            }

                            if (active) {
                                // Inject override
                                const stat = getHighestStat(null, poke.nature, poke.evs, poke.ability);
                                console.log(`[DEBUG] Paradox Active! Boosted Stat: ${stat}`);
                                if (!poke.overrides) poke.overrides = {};
                                poke.overrides.abilityOn = true;
                                poke.overrides.boostedStat = stat;
                            } else {
                                console.log(`[DEBUG] Paradox Inactive.`);
                            }
                        };

                        // Apply to User
                        if (effectiveUser === userPoke) {
                            effectiveUser = JSON.parse(JSON.stringify(userPoke));
                        }
                        checkParadox(effectiveUser, fieldArgs);

                        // STELLAR TERA OFFENSE FIX
                        // Library doesn't support Stellar boosts. We assume Base Type for defense/STAB (isTera=false)
                        // and manually boost BP.
                        let isTeraCalc = userScenario.isTera;
                        let customMoveName = move;
                        let fieldOptions = { ...fieldArgs }; // clone

                        if (userScenario.isTera && effectiveUser.teraType === 'Stellar') {
                            isTeraCalc = false; // Treat as non-Tera for Type Matchups

                            // Determine Boost
                            // We need to know if the move is STAB or not relative to ORIGINAL types.
                            // We can use a dummy calculation to check 'STAB' flag? Or check types manually.
                            // calculate() result has .move.stab?
                            // Let's do a lightweight check using the dummyPoke we created earlier or similar.
                            // Or just calculate with isTera=false (Base) and see if result.move.stab is true?
                            // But calculating twice is expensive.

                            // Optimization: Check types from `dummyPoke` (created at line 141)
                            // We need types of the generic species.
                            const baseTypes = (dummyPoke as any).types || (dummyPoke.species as any).types;
                            // move data? We have move name.
                            // We can fetch move data using Calc lib
                            const tempMove = new calcLib.Move(calcLib.Generations.get(gen), move);
                            const isStab = baseTypes.includes(tempMove.type);

                            // Apply Multiplier to Base Power
                            // If STAB: Base 1.5 -> Stellar 2.0. Factor = 2.0 / 1.5 = 1.3333
                            // If Non-STAB: Base 1.0 -> Stellar 1.2. Factor = 1.2
                            // Note: Adaptability would complicate this. Avoiding edge cases for now.
                            const multiplier = isStab ? (2.0 / 1.5) : 1.2;

                            // We can't easily change BP of a string move.
                            // We rely on `calculator.ts` creating a new Move().
                            // We can pass an override via fieldArgs? No.
                            // We can modify the `move` argument? It's a string in this loop.
                            // `calculateDamage` takes `moveName: string`.
                            // If we want to change BP, we need to change how `calculateDamage` works or pass an object.
                            // `DamageCalculator` wrapper currently takes string.
                            // ...

                            // Alternative: Use `effectiveUser.overrides` to boost damage?
                            // `user.overrides.ate`? No.

                            // Let's modify `DamageCalculator.ts` (wrapper) to accept Move Options?
                            // Too invasive right now.

                            // HACK: Use `Helping Hand` field arg as a proxy for generic boost?
                            // No, HH is 1.5x.

                            // CORRECT APPROACH: Update `calculateDamage` in `calculator.ts` to accept `moveOverride`?
                            // OR: Just apply the boost manually to the resulting damage range?
                            // Range is [min, max].
                            // We can multiply [min, max] by multiplier.
                            // The only issue is rounding logic inside the damage formula (which happens at multiple steps).
                            // But for a rough approximation (and since this is the only way without deep refactor),
                            // POST-CALC SCALING is 99% accurate for simple multipliers.
                            // Let's use `isTeraCalc = false` and then scale the output.
                        }


                        // Terapagos Form Change Logic
                        let currentStats = baseStats;
                        if (userScenario.isTera && effectiveUser.teraType === 'Stellar' && (effectiveUser.species.includes('Terapagos'))) {
                            effectiveUser.species = 'Terapagos-Stellar';
                            effectiveUser.ability = 'Teraform Zero';
                            currentStats = { hp: 160, atk: 105, def: 110, spa: 130, spd: 110, spe: 85 };
                        }

                        // Calculate Damage
                        // Calculate Damage
                        let result;
                        try {
                            result = calc.calculateDamage(
                                effectiveUser, effectiveDefender, customMoveName,
                                isTeraCalc, defenderScenario.isTera,
                                fieldOptions,
                                { hits: settings?.hitCount } // Pass manual hit count
                            );
                        } catch (e) {
                            console.warn(`Calculation failed for ${defender.species} with ${move}:`, e);
                            continue;
                        }

                        // STELLAR POST-CALC
                        if (userScenario.isTera && effectiveUser.teraType === 'Stellar') {
                            const baseTypes = (dummyPoke as any).types || (dummyPoke.species as any).types;
                            const tempMove = result.move; // use result's move (has type)
                            const isStab = baseTypes.includes(tempMove.type);
                            const multiplier = isStab ? (2.0 / 1.5) : 1.2;

                            // Apply to range
                            // result.range() returns a new array, we can't modify it in place effectively to change `result`.
                            // But we use `minDmg` / `maxDmg` variables below.
                            // We just need to scale those.
                            // Wait, result object is used for kochance too.
                            // Kochance depends on damage.

                            // If we assume the library result is "Base Damage", we scale it.
                            const originalRange = result.range();

                            // We need to override the behavior of `range` and `kochance`?
                            // Too hard.
                            // Just scale the local variables `minDmg` and `maxDmg`.
                            // And `kochance`... we might need to re-estimate or ignore.
                            // Or, we can blindly trust the user understands it's an estimate?
                            // Actually, let's just scale min/max/dmg.
                        }

                        let range = result.range();

                        if (userScenario.isTera && effectiveUser.teraType === 'Stellar') {
                            const baseTypes = (dummyPoke as any).types || (dummyPoke.species as any).types;
                            // Note: Accessing internal types from dummyPoke might be flaky if form changed.
                            // But good enough.
                            const tempMove = result.move;
                            const isStab = baseTypes.includes(tempMove.type);
                            const multiplier = isStab ? (5325 / 4096) : (4915 / 4096);
                            // 2.0/1.5 ~= 1.333 (~5461/4096?).
                            // SV uses 4096-based chain.
                            // Stellar (STAB): 8192/4096 (2.0) vs 6144/4096 (1.5). 2.0/1.5 = 1.3333.
                            // Let's use simple float mult for now: 1.2 and 1.3333
                            // Math.round? Pokemon truncates usually.

                            range = range.map(d => Math.floor(d * multiplier)) as [number, number];

                            // Update result.damage for correct KO chance calculation
                            // We cast to any to allow mutation since result.damage isn't strictly readonly but treating it as such in types
                            if (typeof result.damage === 'number') {
                                (result as any).damage = Math.floor(result.damage * multiplier);
                            } else if (Array.isArray(result.damage)) {
                                (result as any).damage = result.damage.map((d: any) => {
                                    if (Array.isArray(d)) {
                                        return d.map((v: number) => Math.floor(v * multiplier));
                                    }
                                    return Math.floor(d * multiplier);
                                });
                            }
                        }

                        const minDmg = range[0];
                        const maxDmg = range[1];
                        const defMaxHP = result.defender.stats.hp;
                        const percentage = Math.floor((minDmg / defMaxHP) * 100);
                        const maxPercentage = Math.floor((maxDmg / defMaxHP) * 100);
                        const dmgStr = `${minDmg} ~ ${maxDmg}`;

                        const ko = calculateBerryAdjustedKO(result, minDmg, maxDmg);

                        let killDesc = '';
                        if (ko.n) {
                            if (ko.text) killDesc = translateText(ko.text);
                            else {

                                const pct = Math.floor((ko.chance || 0) * 100);
                                if (pct >= 100) killDesc = `確定${ko.n}発`;
                                else killDesc = `乱数${ko.n}発 (${pct}%)`;
                            }
                        } else {
                            // Fallback for very low damage or immunity
                            if (minDmg === 0) killDesc = 'ダメージ無し';
                            else killDesc = '乱数4発～';
                        }

                        // Detect Spread Override for Display
                        let moveNameDisplay = t(move);
                        const isSpreadOverride = (globalField?.global?.isSpreadDamage === false);
                        // Check if move was actually a spread move
                        if (isSpreadOverride && ['allAdjacent', 'allAdjacentFoes'].includes(result.move.target || '')) {
                            moveNameDisplay += ' (単体)';
                        }

                        const cat = result.move.category;
                        // Use effectiveUser.boosts to determine stage
                        const statKey = cat === 'Physical' ? 'atk' : 'spa';
                        const stage = effectiveUser.boosts ? (effectiveUser.boosts[statKey] || 0) : 0;

                        // Recalculate Base Stat (Pre-Stage) to ensure consistency
                        // We use the helper calcStat defined in scope which uses current variants
                        // Note: userStatValue from result.attacker.stats might already be modified if Intimidate applied? (It seemed so: 136)
                        // So we explicitly calculate the "Sheet Stat".
                        const nature = result.attacker.nature;
                        const natureRef: { [key: string]: string } = { 'Adamant': 'atk', 'Bravery': 'atk', 'Lonely': 'atk', 'Naughty': 'atk', 'Bold': 'def', 'Relaxed': 'def', 'Impish': 'def', 'Lax': 'def', 'Modest': 'spa', 'Mild': 'spa', 'Quiet': 'spa', 'Rash': 'spa', 'Calm': 'spd', 'Gentle': 'spd', 'Sassy': 'spd', 'Careful': 'spd', 'Timid': 'spe', 'Hasty': 'spe', 'Jolly': 'spe', 'Naive': 'spe' };
                        const natureAnti: { [key: string]: string } = { 'Modest': 'atk', 'Timid': 'atk', 'Calm': 'atk', 'Bold': 'atk', 'Adamant': 'spa', 'Impish': 'spa', 'Jolly': 'spa', 'Careful': 'spa' };

                        let statArrow = '';
                        if (natureRef[nature] === statKey) statArrow = '↑';
                        else if (natureAnti[nature] === statKey) statArrow = '↓';

                        // Calculate Raw Stat using CURRENT stats (Stellar or Base)
                        // This ensures display reflects Form Change (e.g. Terapagos-Stellar)
                        const baseVal = currentStats[statKey];
                        const rawStat = calcRealStatWithBase(baseVal, userPoke.evs[statKey], 31,
                            natureRef[nature] === statKey ? 1.1 : (natureAnti[nature] === statKey ? 0.9 : 1.0)
                        );

                        let userStat = `${rawStat}${statArrow}`;
                        if (stage !== 0) {
                            const sign = stage > 0 ? '+' : '';
                            userStat = `${rawStat}${statArrow} (${sign}${stage})`;
                        }

                        let cleanName = t(defender.species);
                        let abilityLabel = '-';
                        if (defender.extraLabel) {
                            const match = defender.extraLabel.match(/\(([^)]+)\)/);
                            if (match) abilityLabel = match[1];
                        }

                        // Use getDisplayAbility for consistent display
                        // Note: variantLabel is used for User Variants. 
                        // defender.extraLabel is used for Opponent Variants.
                        const userAbilityDisplay = getDisplayAbility(effectiveUser.ability || '-', variantLabel, effectiveUser.item, fieldArgs.weather, fieldArgs.terrain);
                        const oppAbilityDisplay = getDisplayAbility(defender.ability || '-', defender.extraLabel || '', defender.item, fieldArgs.weather, fieldArgs.terrain);

                        // Helper to build comprehensive Field State string
                        const getFieldState = (args: any) => {
                            const parts = [];
                            if (args.weather && args.weather !== 'None') parts.push(t(args.weather));
                            if (args.terrain && args.terrain !== 'None') {
                                if (args.terrain === 'Electric') parts.push('エレキ');
                                else if (args.terrain === 'Psychic') parts.push('サイコ');
                                else parts.push(t(args.terrain));
                            }

                            // Global Ruins
                            if (args.isSwordOfRuin) parts.push('つるぎ');
                            if (args.isBeadsOfRuin) parts.push('たま');
                            if (args.isTabletsOfRuin) parts.push('おふだ');
                            if (args.isVesselOfRuin) parts.push('うつわ');

                            // Defender Side (Screens/Guard) - Reducing Damage
                            const def = args.defenderSide || {};
                            if (def.isReflect) parts.push('リフレク');
                            if (def.isLightScreen) parts.push('光の壁');
                            if (def.isFriendGuard) parts.push('フレガ');
                            if (def.isAuroraVeil) parts.push('ベール');

                            // Attacker Side (Helping Hand) - Boosting Damage
                            const att = args.attackerSide || {};
                            if (att.isHelpingHand) parts.push('手助け');
                            // Battery? Power Spot? (If implemented in future)

                            return parts.length > 0 ? parts.join(', ') : '-';
                        };

                        const fieldState = getFieldState(fieldArgs);

                        const teraLabel = defenderScenario.isTera ? (t(defender.teraType || '') || 'Terastal') : '-';

                        attackResults.push({
                            '状況': `${userScenario.label}${variantLabel}`,
                            '自分実数値': userStat,
                            '自分特性': userAbilityDisplay,
                            '自分テラスタル': formatVal(userScenario.label.replace(' (テラ: ', '').replace(')', '')),
                            '自分持ち物': t(effectiveUser.item || '-'),
                            '技': moveNameDisplay,
                            '相手': cleanName,
                            '相手特性': oppAbilityDisplay,
                            '相手テラスタル': teraLabel,
                            '相手持ち物': t(defender.item),
                            '相手HP': defMaxHP,
                            '相手防御実数': cat === 'Physical' ? result.defender.stats.def : result.defender.stats.spd,
                            'DamagePct': percentage === maxPercentage ? `${percentage}%` : `${percentage}% ~ ${maxPercentage}%`,
                            '確定数': killDesc,
                            'DamageReal': dmgStr,
                            '場の状態': formatVal(fieldState),
                            // Hidden Metadata
                            // Hidden Metadata for Deduplication & Reconstruction
                            '_meta': {
                                minDmg, maxDmg,
                                species: defender.species,
                                userTera: userScenario.isTera,
                                defenderTera: defenderScenario.isTera,
                                formattedName: `${cleanName}${abilityLabel}`,
                                // Context preservation for Line Calc
                                context: {
                                    userPoke, defender, move,
                                    userScenario, defenderScenario,
                                    fieldArgs, isIntimidate: isIntimidateActive
                                }
                            }
                        });
                    }
                }
            }
        }

        // -------------------------------------------------------------------------
        // 2. Defense (Receive Damage)
        // -------------------------------------------------------------------------
        for (const userScenario of userScenarios) {
            for (const attacker of targets) {
                for (const move of attacker.moves) {
                    const attackerScenarios = [{ isTera: false, label: '' }];
                    if (attacker.teraType) attackerScenarios.push({ isTera: true, label: ` (テラ: ${t(attacker.teraType || '')})` });

                    for (const attackerScenario of attackerScenarios) {
                        // Clone attacker to apply Global Opponent Ranks
                        let effectiveAttackerBase = JSON.parse(JSON.stringify(attacker)); // We clone base first
                        if (globalField && globalField.opponentRanks) {
                            if (!effectiveAttackerBase.boosts) effectiveAttackerBase.boosts = {};
                            const r = globalField.opponentRanks;
                            effectiveAttackerBase.boosts.atk = (effectiveAttackerBase.boosts.atk || 0) + (r.atk || 0);
                            effectiveAttackerBase.boosts.def = (effectiveAttackerBase.boosts.def || 0) + (r.def || 0);
                            effectiveAttackerBase.boosts.spa = (effectiveAttackerBase.boosts.spa || 0) + (r.spa || 0);
                            effectiveAttackerBase.boosts.spd = (effectiveAttackerBase.boosts.spd || 0) + (r.spd || 0);
                            effectiveAttackerBase.boosts.spe = (effectiveAttackerBase.boosts.spe || 0) + (r.spe || 0);
                        }

                        // Field Setup
                        const fieldArgs: any = { ...baseFieldArgs, gameType: 'Doubles' };

                        // Apply Global Field State (v2.4) - Defense Context
                        if (globalField) {
                            // 1. Global Ruins
                            if (globalField.global.isSwordOfRuin) fieldArgs.isSwordOfRuin = true;
                            if (globalField.global.isBeadsOfRuin) fieldArgs.isBeadsOfRuin = true;
                            if (globalField.global.isTabletsOfRuin) fieldArgs.isTabletsOfRuin = true;
                            if (globalField.global.isVesselOfRuin) fieldArgs.isVesselOfRuin = true;

                            // 2. Side Logic (Context: Opponent is Attacker, User is Defender)
                            // User Side -> Defender Side
                            fieldArgs.defenderSide = {
                                isReflect: globalField.userSide.isReflect,
                                isLightScreen: globalField.userSide.isLightScreen,
                                isFriendGuard: globalField.userSide.isFriendGuard
                                // User HH doesn't help defense
                            };

                            // Opponent Side -> Attacker Side
                            fieldArgs.attackerSide = {
                                isReflect: globalField.opponentSide.isReflect,
                                isLightScreen: globalField.opponentSide.isLightScreen,
                                isFriendGuard: globalField.opponentSide.isFriendGuard
                                // Helping Hand from Opponent? Not tracked.
                            };

                            // 3. Weather & Terrain (Priority: Manual > Variant)
                            if (globalField.weather && globalField.weather !== 'None') fieldArgs.weather = globalField.weather;
                            if (globalField.terrain && globalField.terrain !== 'None') fieldArgs.terrain = globalField.terrain;
                        }

                        // Helper to detect specific Ability Auto-Setters (for Customs or missing forcedField)
                        const getAbilityWeather = (ability: string) => {
                            if (!ability) return null;
                            const a = ability.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (a === 'drought' || a === 'orichalcumpulse') return 'Sun';
                            if (a === 'drizzle') return 'Rain';
                            if (a === 'sandstream') return 'Sand';
                            if (a === 'snowwarning') return 'Snow';
                            return null;
                        };

                        const getAbilityTerrain = (ability: string) => {
                            if (!ability) return null;
                            const a = ability.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (a === 'grassysurge') return 'Grassy';
                            if (a === 'electricsurge' || a === 'hadronengine') return 'Electric';
                            if (a === 'psychicsurge') return 'Psychic';
                            if (a === 'mistysurge') return 'Misty';
                            return null;
                        };

                        // Priorities:
                        // 1. Manual Global Setting (if not 'None')
                        // 2. Attacker Ability (forcedField or Auto-Detect)

                        // Check Attacker Ability Weather
                        const abilityWeather = attacker.forcedField?.weather || getAbilityWeather(attacker.ability);
                        const abilityTerrain = attacker.forcedField?.terrain || getAbilityTerrain(attacker.ability);

                        // Apply Weather if global is None/Unset and Ability provides one
                        if ((!fieldArgs.weather || fieldArgs.weather === 'None') && abilityWeather) {
                            fieldArgs.weather = abilityWeather;
                        }

                        // Apply Terrain if global is None/Unset and Ability provides one
                        if ((!fieldArgs.terrain || fieldArgs.terrain === 'None') && abilityTerrain) {
                            fieldArgs.terrain = abilityTerrain;
                        } else if ((!fieldArgs.terrain || fieldArgs.terrain === 'None') && attacker.species === 'Rillaboom' && !attacker.extraLabel) {
                            // Fallback for Rillaboom (though getAbilityTerrain should catch it if Ability is correct)
                            fieldArgs.terrain = 'Grassy';
                        }

                        let effectiveAttacker: any = effectiveAttackerBase; // Changed from attacker to effectiveAttackerBase
                        // Use variant-specific Intimidate flag
                        if (variant.forcedField?.isDefenderIntimidated) {
                            effectiveAttacker = JSON.parse(JSON.stringify(effectiveAttackerBase)); // Clone base (with ranks)
                            if (!effectiveAttacker.boosts) effectiveAttacker.boosts = {};
                            effectiveAttacker.boosts.atk = (effectiveAttacker.boosts.atk || 0) - 1;
                        }

                        const result = calc.calculateReceivedDamage(
                            effectiveAttacker, userPoke, move,
                            attackerScenario.isTera, userScenario.isTera,
                            fieldArgs
                        );

                        const range = result.range();
                        const maxDmg = range[1];
                        if (maxDmg === 0) continue; // Filter Immunity

                        const userMaxHP = result.defender.stats.hp;
                        const minPercentage = Math.floor((range[0] / userMaxHP) * 100);
                        const maxPercentage = Math.floor((maxDmg / userMaxHP) * 100);
                        const percentageDisplay = minPercentage === maxPercentage ? `${minPercentage}%` : `${minPercentage} ~ ${maxPercentage}%`;

                        const dmgStr = `${range[0]} ~ ${maxDmg}`;
                        const ko = calculateBerryAdjustedKO(result, range[0], maxDmg);
                        const killDesc = translateText(ko.text || '');

                        // Filter Weak Moves (3HKO or worse)
                        if (settings?.excludeWeakMoves) {
                            // Revised Filter:
                            // Keep: Guaranteed 3HKO (確定3発) or better.
                            // Exclude: Random 3HKO (乱数3発) and anything worse (4HKO+).

                            // Check for 4 hits or more (4-9, 10+)
                            if (/[4-9]発|\d{2}発/.test(killDesc)) continue;

                            // Check for Random 3 hits (乱数3発)
                            // "乱数3発" means it's generally 4HKO but has a chance of 3. which is worse than Guaranteed 3HKO.
                            // "確定3発" is kept.
                            if (killDesc.includes('乱数3発')) continue;
                        }

                        const realHP = result.defender.stats.hp;
                        const realDef = result.defender.stats.def;
                        const realSpD = result.defender.stats.spd;

                        // Helper to build comprehensive Field State string
                        const getFieldState = (args: any) => {
                            const parts = [];
                            if (args.weather && args.weather !== 'None') parts.push(t(args.weather));
                            if (args.terrain && args.terrain !== 'None') {
                                if (args.terrain === 'Electric') parts.push('エレキ');
                                else if (args.terrain === 'Psychic') parts.push('サイコ');
                                else parts.push(t(args.terrain));
                            }

                            // Global Ruins
                            if (args.isSwordOfRuin) parts.push('つるぎ');
                            if (args.isBeadsOfRuin) parts.push('たま');
                            if (args.isTabletsOfRuin) parts.push('おふだ');
                            if (args.isVesselOfRuin) parts.push('うつわ');

                            // Defender Side (Screens/Guard) - Reducing Damage
                            const def = args.defenderSide || {};
                            if (def.isReflect) parts.push('リフレク');
                            if (def.isLightScreen) parts.push('光の壁');
                            if (def.isFriendGuard) parts.push('フレガ');
                            if (def.isAuroraVeil) parts.push('ベール');

                            // Attacker Side (Helping Hand) - Boosting Damage
                            const att = args.attackerSide || {};
                            if (att.isHelpingHand) parts.push('手助け');
                            // Battery? Power Spot? (If implemented in future)

                            return parts.length > 0 ? parts.join(', ') : '-';
                        };

                        const fieldState = getFieldState(fieldArgs);

                        // Fix: "Psychic" matches both Type (Esper) and Move (Psychic) in translator.
                        const getTeraDisplay = (val: string) => {
                            if (val === '-' || !val) return '-';
                            const type = val.replace(' (テラ: ', '').replace(')', '');
                            if (type === 'Psychic') return 'エスパー';
                            return t(type);
                        };

                        // Detect Spread Override for Display (Defense)
                        let moveNameDisplay = t(move);
                        const isSpreadOverride = (globalField?.global?.isSpreadDamage === false);
                        if (isSpreadOverride && ['allAdjacent', 'allAdjacentFoes'].includes(result.move.target || '')) {
                            moveNameDisplay += ' (単体)';
                        }

                        const row: any = { // Explicit any for indexing
                            'HP実数': realHP,
                            '防御実数': realDef,
                            '特防実数': realSpD,
                            '自分テラスタル': getTeraDisplay(userScenario.label),
                            '相手': (() => {
                                const base = t(attacker.species);
                                const extra = attacker.extraLabel || '';
                                return base.endsWith(extra) ? base : `${base}${extra}`;
                            })(),
                            '相手テラスタル': getTeraDisplay(attackerScenario.label),
                            '相手持ち物': formatVal(t(attacker.item)),
                            '技': moveNameDisplay,
                            '場の状態': formatVal(fieldState),
                            // Combined "Opponent Stat" (Defender Side): H + B or D
                            '相手ステータス': (() => {
                                const statLabel = result.move.category === 'Physical' ? 'B' : 'D';
                                return `H${realHP} / ${statLabel}${result.move.category === 'Physical' ? realDef : realSpD}`;
                            })(),
                            // Combined "User Stat" (Attacker Side): A or C
                            '自分ステータス': (() => {
                                const statLabel = result.move.category === 'Physical' ? 'A' : 'C';
                                const val = result.move.category === 'Physical' ? result.attacker.stats.atk : result.attacker.stats.spa;
                                return `${statLabel}${val}`;
                            })(),
                            'ダメージ': `${percentageDisplay} (${range[0]} ~ ${maxDmg})`,
                            '確定数': (() => {
                                // Shorten KO Text
                                return killDesc
                                    .replace(/確定(\d+)発/, '確$1')
                                    .replace(/乱数(\d+)発/, '乱$1')
                                    .replace(/（/g, '(').replace(/）/g, ')');
                            })(),
                            // New Fields
                            '相手特性': getDisplayAbility(effectiveAttacker.ability || '-', attacker.extraLabel || '', effectiveAttacker.item, fieldArgs.weather, fieldArgs.terrain),
                            '自分特性': getDisplayAbility(userPoke.ability || '-', variantLabel, userPoke.item, fieldArgs.weather, fieldArgs.terrain),
                            '自分持ち物': t(userPoke.item || '-'),
                            '_meta': {

                                minDmg: range[0],
                                maxDmg: range[1],
                                species: attacker.species,
                                userTera: userScenario.isTera,
                                attackerTera: attackerScenario.isTera,
                                formattedName: `${t(attacker.species)}${attacker.extraLabel || ''}`,
                                // Context preservation for Line Calc
                                context: {
                                    userPoke, attacker, move,
                                    userScenario, attackerScenario,
                                    fieldArgs
                                }
                            }
                        };

                        if (result.move.category === 'Physical') {
                            physDefResults.push(row);
                        } else if (result.move.category === 'Special') {
                            specDefResults.push(row);
                        }
                    }
                }
            }
        }
    } // END VARIANTS LOOP

    // =========================================================================
    // PHASE 2: Smart Deduplication
    // =========================================================================
    const finalAttackResults = smartDeduplicate(attackResults);
    const finalPhysDefResults = smartDeduplicate(physDefResults);
    const finalSpecDefResults = smartDeduplicate(specDefResults);

    // =========================================================================
    // PHASE 3: Targeted Line Calculations (Optimized)
    // =========================================================================

    // Helper: Define Tiers for Defensive Line Analysis
    const getAttackerTiers = (species: string) => {
        const fastMons = [
            'Flutter Mane', 'Chi-Yu', 'Chien-Pao', 'Iron Bundle', 'Koraidon', 'Miraidon',
            'Calyrex-Shadow', 'Zacian-Crowned', 'Zamazenta-Crowned', 'Dragapult',
            'Roaring Moon', 'Iron Valiant', 'Spectrier', 'Regieleki', 'Deoxys-Attack',
            'Ogerpon-Hearthflame', 'Ogerpon-Wellspring', 'Landorus-Therian' // Fast or frequently Scarf/Speed boosted
        ];
        const supportMons = [
            'Amoonguss', 'Clefairy', 'Grimmsnarl', 'Whimsicott', 'Comfey', 'Maushold',
            'Scream Tail', 'Pachirisu', 'Clefable', 'Farigiraf', 'Indeedee-F',
            'Murkrow', 'Torkoal', 'Pelipper', 'Ninetales-Alola', 'Politoed'
        ];

        // Branching Logic
        if (supportMons.includes(species)) {
            return [{ label: '4振り', type: '4ev' }];
        } else if (fastMons.includes(species)) {
            return [
                { label: '特化', type: 'Spec' },
                { label: '準特化', type: 'Semi' }
            ];
        } else {
            return [{ label: '特化', type: 'Spec' }];
        }
    };

    // 3.1 Defensive Lines (Based on Deduped Physical/Special Defense Results)
    const processDefensiveLines = (dedupedResults: any[], targetList: any[]) => {
        for (const r of dedupedResults) {
            const ctx = r['_meta'].context;
            if (!ctx) continue;

            // Re-run the Line Calc finding using the exact scenario from dedup
            const { attacker, userPoke, move, attackerScenario, userScenario, fieldArgs } = ctx;

            if (move === 'Fake Out' || move === 'ねこだまし') continue;

            // Basic Check & Get Category
            const dummyRes = calc.calculateDamage(attacker, userPoke, move, attackerScenario.isTera, userScenario.isTera, fieldArgs);
            const category = dummyRes.move.category;
            if (category === 'Status') continue;

            // Filter 0 Damage (Immunity)
            if (dummyRes.range()[1] === 0) continue;

            const tiers = [
                { type: 'Registered', label: '登録値' },
                { type: 'Spec', label: '特化' },
                { type: 'Semi', label: '無補正252' }
            ];

            // Prepare Result Row
            let maxNeeded = 0; // Track max EVs across tiers for sorting
            const row: any = {
                // Initial Default Values
                '実数値1': '-', '結果1': '-',
                '特化': '-', '結果2': '-',
                '無補正252': '-', '結果3': '-',
                '_sortVal': 0, // Sort Value

                // Values from Source
                'HP実数': r['HP実数'],
                '防御実数': r['防御実数'],
                '特防実数': r['特防実数'],
                '自分テラスタル': r['自分テラスタル'],
                '自分特性': r['自分特性'],
                '自分持ち物': r['自分持ち物'],
                '相手': r['相手'],
                '相手テラスタル': r['相手テラスタル'],
                '相手持ち物': r['相手持ち物'],
                '技': r['技'],
                '場の状態': r['場の状態'],
                '_meta': r['_meta'] // Ensure meta is passed for icons
            };

            // Get Opponent Base Stats for Real Stat display
            const attackerRawStats = calcLib.Generations.get(gen).species.get(calcLib.toID(attacker.species))?.baseStats;

            let slotIndex = 1;
            let hasMeaningfulResult = false;

            for (const tier of tiers) {
                // Configure Attacker for Tier
                const tierAttacker = JSON.parse(JSON.stringify(attacker));
                // const tierLabel = tier.label; // Label no longer used in column

                // Set Nature and EVs
                const statKey = category === 'Physical' ? 'atk' : 'spa';

                if (tier.type === 'Spec') {
                    tierAttacker.evs[statKey] = 252;
                    tierAttacker.nature = category === 'Physical' ? 'Adamant' : 'Modest';
                } else if (tier.type === 'Semi') {
                    tierAttacker.evs[statKey] = 252;
                    tierAttacker.nature = category === 'Physical' ? 'Jolly' : 'Timid';
                } else if (tier.type === 'Registered') {
                    // Use existing attacker config (already cloned into tierAttacker)
                    // No changes needed
                }

                // Run Line Explorer
                const lineRes = explorer.findDefensiveLine(
                    tierAttacker, userPoke, move, category as 'Physical' | 'Special',
                    attackerScenario.isTera, userScenario.isTera,
                    fieldArgs
                );

                if (lineRes) {
                    if (!lineRes.success) maxNeeded = 9999; // Impossible = Hardest
                    else {
                        const total = (lineRes.evs.hp || 0) + (lineRes.evs.def || 0) + (lineRes.evs.spd || 0);
                        maxNeeded = Math.max(maxNeeded, total);
                    }

                    if (lineRes.thresholdDesc !== '高耐久') {
                        hasMeaningfulResult = true;
                    }

                    // Populate User Real Stats (HP/Def/SpD) if Success (Only for first slot needed? Or consistently?)
                    // Logic was `if (slotIndex === 1 && lineRes.success)`. 
                    // Now Slot 1 is "Registered". This is fine. Use it as baseline.
                    if (slotIndex === 1 && lineRes.success) {
                        const nature = lineRes.nature || userPoke.nature;
                        const natureBoosts: { [key: string]: string } = {
                            'Bold': 'def', 'Calm': 'spd', 'Impish': 'def', 'Careful': 'spd',
                            'Modest': 'atk', 'Adamant': 'atk', 'Timid': 'spe', 'Jolly': 'spe'
                        };
                        const boostedStat = natureBoosts[nature];
                        const getMult = (s: string) => s === boostedStat ? 1.1 : 1.0;
                        const realHP = calcStat('hp', lineRes.evs.hp);
                        const displayDef = calcStat('def', lineRes.evs.def || 0, 31, getMult('def'));
                        const displaySpD = calcStat('spd', lineRes.evs.spd || 0, 31, getMult('spd'));
                        let defText = displayDef.toString();
                        let spdText = displaySpD.toString();
                        if (category === 'Physical' && nature === 'Bold' && userPoke.nature !== 'Bold') defText += '↑';
                        if (category === 'Special' && nature === 'Calm' && userPoke.nature !== 'Calm') spdText += '↑';

                        row['HP実数'] = realHP;
                        row['防御実数'] = defText;
                        row['特防実数'] = spdText;
                    }

                    // Calculate Opponent Real Stat

                    const baseStatVal = attackerRawStats ? attackerRawStats[statKey] : 0;
                    // For registered, we need actual mult.
                    let oppNatureMult = 1.0;
                    if (tier.type === 'Registered') {
                        // Calc from tierAttacker.nature
                        // ... logic ...
                        const n = tierAttacker.nature;
                        const plus: any = { 'Adamant': 'atk', 'Modest': 'spa', 'Jolly': 'spe', 'Timid': 'spe', 'Bold': 'def', 'Impish': 'def', 'Calm': 'spd', 'Careful': 'spd' };
                        const minus: any = { 'Modest': 'atk', 'Timid': 'atk', 'Adamant': 'spa', 'Jolly': 'spa' };
                        // Simplified check for Atk/SpA
                        if ((category === 'Physical' && plus[n] === 'atk') || (category === 'Special' && plus[n] === 'spa')) oppNatureMult = 1.1;
                        else if ((category === 'Physical' && minus[n] === 'atk') || (category === 'Special' && minus[n] === 'spa')) oppNatureMult = 0.9;
                    } else {
                        // As before
                        oppNatureMult =
                            (tierAttacker.nature === 'Jolly' && category === 'Physical' && statKey === 'atk') ||
                                (tierAttacker.nature === 'Timid' && category === 'Special' && statKey === 'spa')
                                ? 1.0 : (
                                    (tierAttacker.nature === 'Adamant' && category === 'Physical') ||
                                        (tierAttacker.nature === 'Modest' && category === 'Special')
                                        ? 1.1 : (
                                            (tierAttacker.nature === 'Modest' && category === 'Physical') ||
                                                (tierAttacker.nature === 'Timid' && category === 'Physical') ||
                                                (tierAttacker.nature === 'Adamant' && category === 'Special') ||
                                                (tierAttacker.nature === 'Jolly' && category === 'Special')
                                                ? 0.9 : 1.0
                                        )
                                );
                    }


                    const oppRealStat = calcRealStatWithBase(baseStatVal, tierAttacker.evs[statKey], 31, oppNatureMult, false);
                    let oppArrow = '';
                    if (oppNatureMult > 1.0) oppArrow = '↑';
                    else if (oppNatureMult < 1.0) oppArrow = '↓';

                    let resStr = '';
                    if (!lineRes.success && lineRes['thresholdDesc']) {
                        if (lineRes['thresholdDesc'] === '解なし') resStr = '無理';
                        else resStr = lineRes['thresholdDesc'];
                    } else if (!lineRes.success) {
                        resStr = '無理';
                    } else {
                        // Format Short KO
                        const shortKO = (text: string) => {
                            return text
                                .replace(/確定(\d+)発/, '確$1')
                                .replace(/乱数(\d+)発/, '乱$1')
                                .replace(/（/g, '(').replace(/）/g, ')');
                        };

                        const evParts = [];
                        if (lineRes.evs.hp > 0) evParts.push(`H${lineRes.evs.hp}`);
                        // Compact Stat Logic: If Physical -> B, If Special -> D
                        if ((category === 'Physical' ? lineRes.evs.def : lineRes.evs.spd) > 0) {
                            evParts.push(`${category === 'Physical' ? 'B' : 'D'}${category === 'Physical' ? lineRes.evs.def : lineRes.evs.spd}`);
                        }
                        const evStr = evParts.length > 0 ? evParts.join(' ') : '無振り';
                        const w = lineRes.thresholdDesc ? shortKO(lineRes.thresholdDesc) : '耐え';
                        resStr = `${evStr} (${w})`;
                    }

                    // Map to new Columns based on Tier
                    if (tier.type === 'Registered') {
                        row['実数値1'] = `${oppRealStat}${oppArrow}`;
                        row['結果1'] = resStr;
                    } else if (tier.type === 'Spec') {
                        row['特化'] = `${oppRealStat}${oppArrow}`;
                        row['結果2'] = resStr;
                    } else if (tier.type === 'Semi') {
                        row['無補正252'] = `${oppRealStat}${oppArrow}`;
                        row['結果3'] = resStr;
                    }

                } else {
                    if (tier.type === 'Registered') {
                        row['実数値1'] = '-';
                        row['結果1'] = '無理';
                    } else if (tier.type === 'Spec') {
                        row['特化'] = '-';
                        row['結果2'] = '無理';
                    } else if (tier.type === 'Semi') {
                        row['無補正252'] = '-';
                        row['結果3'] = '無理';
                    }
                }

                if (lineRes.success) {
                    const hp = calcStat('hp', lineRes.evs.hp);
                    // Better to use actual resulting stats.
                    const n = lineRes.nature || userPoke.nature;
                    const boostMap: any = { 'Bold': 'def', 'Impish': 'def', 'Calm': 'spd', 'Careful': 'spd' };
                    const isBoosted = boostMap[n] === (category === 'Physical' ? 'def' : 'spd');
                    const realStat = calcStat(category === 'Physical' ? 'def' : 'spd', category === 'Physical' ? lineRes.evs.def : lineRes.evs.spd, 31, isBoosted ? 1.1 : 1.0);

                    const durability = hp * realStat;
                    // We want the MAX required durability (hardest tier).
                    maxNeeded = Math.max(maxNeeded, durability);
                } else {
                    // If impossible, treat as very high durability needed?
                    maxNeeded = Math.max(maxNeeded, 999999);
                }

                slotIndex++;
            }
            row['_sortVal'] = maxNeeded;

            // Add Combined Compact Columns for Defensive Lines
            // Opponent (Attacker) Status: A or C
            // We use the dummyRes or just the known category.
            // In Defensive Line context, 'attacker' (from ctx) is the Opponent.
            // Stats are fixed per variant.
            row['相手ステータス'] = (() => {
                const aStat = category === 'Physical' ? dummyRes.attacker.stats.atk : dummyRes.attacker.stats.spa;
                return `${category === 'Physical' ? 'A' : 'C'}${aStat}`;
            })();

            // User (Defender) Status: H and B/D 
            // Since we have multiple tiers (Registered, Spec, Semi), this is ambiguous.
            // But usually this column refers to the BASELINE or REGISTERED stats if applicable.
            // Alternatively, separate columns exist for results.
            // If the user meant the "Result" text itself (resStr), we updated it above (`Hxxx Bxxx`).
            // If the user meant the "User Status" column to the left of results...
            // Let's add it based on the first result (usually Registered or Spec).
            if (dedupedResults[0]['HP実数']) {
                row['自分ステータス'] = (() => {
                    const h = dedupedResults[0]['HP実数'];
                    const b = dedupedResults[0]['防御実数'];
                    const d = dedupedResults[0]['特防実数'];
                    const sLabel = category === 'Physical' ? 'B' : 'D';
                    const sVal = category === 'Physical' ? b : d;
                    return `H${h} / ${sLabel}${sVal}`;
                })();
            }

            if (hasMeaningfulResult) {
                // Add Combined Compact Columns for Defensive Lines
                row['相手ステータス'] = (() => {
                    const aStat = category === 'Physical' ? dummyRes.attacker.stats.atk : dummyRes.attacker.stats.spa;
                    return `${category === 'Physical' ? 'A' : 'C'}${aStat}`;
                })();

                if (dedupedResults[0]['HP実数']) {
                    row['自分ステータス'] = (() => {
                        const h = dedupedResults[0]['HP実数'];
                        const b = dedupedResults[0]['防御実数'];
                        const d = dedupedResults[0]['特防実数'];
                        const sLabel = category === 'Physical' ? 'B' : 'D';
                        const sVal = category === 'Physical' ? b : d;
                        return `H${h} / ${sLabel}${sVal}`;
                    })();
                }
                targetList.push(row);
            }
        }
    };

    processDefensiveLines(finalPhysDefResults, physDefLineResults);
    processDefensiveLines(finalSpecDefResults, specDefLineResults);

    // 3.2 Offensive Lines
    for (const r of finalAttackResults) {
        const ctx = r['_meta'].context;
        if (!ctx) continue;
        const { userPoke, defender, move, userScenario, defenderScenario, fieldArgs } = ctx;

        const isMainMove = move === mainMove;

        // Revised Tiers for Offensive Line
        const tiers = [
            { label: '登録値', evs: defender.evs, nature: defender.nature }, // New
            { label: 'H4', evs: { hp: 4, def: 0, spd: 0 }, nature: 'Hardy' },
            { label: 'H252', evs: { hp: 252, def: 0, spd: 0 }, nature: 'Hardy' },
            { label: 'HB/HD特化', evs: { hp: 252 }, nature: 'Benefit' }
        ];
        const tierResults: { [key: string]: string } = {};

        const dummyRes = calc.calculateDamage(userPoke, defender, move, userScenario.isTera, defenderScenario.isTera, fieldArgs);
        const category = dummyRes.move.category;
        if (category === 'Status') continue;

        // Filter 0 Damage (Immunity)
        if (dummyRes.range()[1] === 0) continue;

        let registeredTierStatStr = '-'; // Store required stat for Registered Case

        for (const tier of tiers) {
            const target = JSON.parse(JSON.stringify(defender));
            // Apply Tier Config
            if (tier.label === '登録値') {
                // Use defender as is
            } else {
                target.evs = tier.evs;
                if (tier.label === 'HB/HD特化') {
                    if (category === 'Physical') {
                        target.evs.def = 252;
                        target.nature = 'Bold';
                    } else {
                        target.evs.spd = 252;
                        target.nature = 'Calm';
                    }
                } else {
                    target.nature = tier.nature;
                }
            }

            // Try to find threshold in order of difficulty
            const thresholds = ['OHKO', '2HKO', '3HKO', '4HKO'];
            let foundLine = false;

            const statLabel = category === 'Physical' ? 'A' : 'C';
            const sKey = category === 'Physical' ? 'atk' : 'spa';

            for (const th of thresholds) {
                const res = explorer.findOffensiveLine(userPoke, target, move, th as any, userScenario.isTera, defenderScenario.isTera, fieldArgs);
                if (res.success) {
                    // Extract number from OHKO/2HKO/3HKO/4HKO
                    const koNum = th === 'OHKO' ? 1 : th[0];
                    tierResults[tier.label] = `確${koNum}: ${statLabel}${res.evs[sKey]}`;
                    foundLine = true;

                    if (tier.label === '登録値' && res.stat) {
                        registeredTierStatStr = res.stat.toString();
                    }
                    break;
                }
            }

            if (!foundLine) {
                tierResults[tier.label] = '-';
            }
        }

        const getBestResult = (targetConfig: any) => {
            const bestUser = JSON.parse(JSON.stringify(userPoke));
            const bestNature = category === 'Physical' ? 'Adamant' : 'Modest';
            const natureSymbol = category === 'Physical' ? 'A↑' : 'C↑';
            bestUser.nature = bestNature;
            const statKey = category === 'Physical' ? 'atk' : 'spa';
            bestUser.evs[statKey] = 252;
            const res = calc.calculateDamage(bestUser, targetConfig, move, userScenario.isTera, defenderScenario.isTera, fieldArgs);
            const range = res.range();
            const minDmg = range[0];
            const maxDmg = range[1];
            const targetHP = res.defender.stats.hp;

            // Guaranteed Check
            if (minDmg >= targetHP) return { ko: 1, desc: `確1: ${natureSymbol} 252`, display: true };
            if (minDmg * 2 >= targetHP) return { ko: 2, desc: `確2: ${natureSymbol} 252`, display: true };
            if (minDmg * 3 >= targetHP) return { ko: 3, desc: `確3: ${natureSymbol} 252`, display: true };
            if (minDmg * 4 >= targetHP) return { ko: 4, desc: `確4: ${natureSymbol} 252`, display: true };

            // Start Probabilistic Check (Random)
            // If Max roll can kill in X hits
            if (maxDmg >= targetHP) return { ko: 1, desc: `乱数1発: ${natureSymbol} 252`, display: true };
            if (maxDmg * 2 >= targetHP) return { ko: 2, desc: `乱数2発: ${natureSymbol} 252`, display: true };
            if (maxDmg * 3 >= targetHP) return { ko: 3, desc: `乱数3発: ${natureSymbol} 252`, display: true };
            if (maxDmg * 4 >= targetHP) return { ko: 4, desc: `乱数4発: ${natureSymbol} 252`, display: true };

            return { ko: 5, desc: '無理', display: false };
        };

        let bestKo = 99;
        for (const tier of tiers) {
            if (tierResults[tier.label] !== '-') {
                if (tier.label === 'HB/HD特化') bestKo = Math.min(bestKo, 2);
                continue;
            }
            const target = JSON.parse(JSON.stringify(defender));
            // Apply Tier Config again for BestResult calc
            if (tier.label === '登録値') {
                // Keep
            } else {
                target.evs = tier.evs;
                if (tier.label === 'HB/HD特化') {
                    if (category === 'Physical') { target.evs.def = 252; target.nature = 'Bold'; }
                    else { target.evs.spd = 252; target.nature = 'Calm'; }
                } else target.nature = tier.nature;
            }

            const best = getBestResult(target);
            if (best.display) {
                if (isMainMove) {
                    tierResults[tier.label] = best.desc;
                    if (tier.label === 'HB/HD特化') bestKo = Math.min(bestKo, best.ko);

                    // Fallback stat for Registered if main calc failed but BestResult works
                    if (tier.label === '登録値' && registeredTierStatStr === '-') {
                        // Extract stat from best.desc? "確1: ... (183)"
                        const m = best.desc.match(/\((\d+)\)$/);
                        if (m) registeredTierStatStr = m[1];
                    }
                }
            } else {
                if (tier.label === 'HB/HD特化') bestKo = Math.min(bestKo, 4);
            }
        }

        const anyCellFilled = Object.values(tierResults).some(val => val !== '-');
        if (anyCellFilled) {
            offensiveLines.push({
                '状況': r['状況'],
                '必要実数値': registeredTierStatStr, // Renamed from 自分実数値 to match Header
                '自分特性': r['自分特性'],
                '自分テラスタル': r['自分テラスタル'],
                '自分持ち物': r['自分持ち物'],
                '技': t(move),
                'MT': r['自分持ち物'], // Temp workaround if needed, but r has it.
                '相手': (() => {
                    const base = r['相手'] || ''; // r['相手'] might already be formatted if copied? No, logic.ts builds it.
                    // Wait, r['相手'] in processAttackLines comes from WHERE?
                    // Ah, it comes from analyzeAttack which returns '相手' formatted.
                    // Let's check line 1055 analyzeAttack.
                    return r['相手'];
                })(),
                '相手特性': r['相手特性'],
                '相手テラスタル': r['相手テラスタル'],
                '相手持ち物': r['相手持ち物'],
                '相手HP': r['相手HP'],
                '相手耐久': category === 'Physical' ? `B${dummyRes.defender.stats.def}` : `D${dummyRes.defender.stats.spd}`,
                '登録値': tierResults['登録値'],
                'H4': tierResults['H4'],
                'H252': tierResults['H252'],
                'HB/HD特化': tierResults['HB/HD特化'],
                '場の状態': r['場の状態'],
                '_meta': r['_meta'], // Add meta for icons

                '_sortVal': (() => {
                    // Sort by Necessary Actual Value (registeredTierStatStr)
                    // If '-', it implies either "Already KO" (Easy) or "Impossible" (Hard).
                    // Usually '-' in this context means "KO with 0 investment" or "Unreachable"?
                    // Check previous logic:
                    // registeredTierStatStr comes from:
                    // 1. findOffensiveLine result.stat
                    // 2. getBestResult -> if display matches.

                    // If it's "-", it usually means findOffensiveLine failed or wasn't applicable.
                    // If we can't KO even with max investment, it's effectively Infinity (Hard).
                    // If we KO with base stats? findOffensiveLine should return something.

                    const num = parseInt(registeredTierStatStr, 10);
                    if (isNaN(num)) return 0; // Default to 0?
                    return num;
                })()
            });
        }
    }

    // Deduplicate Results for Line (Keep existing simple Deduplication for LINES because we generated them from deduped sources,
    // but multiple Attack Scenarios (e.g. user variants) might still yield similar Lines?
    // Actually, simple dedup is still good safe-guard.)
    // New Headers for Split Columns
    const defLineHeadersPhys = ['HP実数', '防御実数', '自分テラスタル', '相手', '相手テラスタル', '相手持ち物', '技', '場の状態', '補正1', '実数値1', '結果1', '補正2', '実数値2', '結果2'];
    const defLineHeadersSpec = ['HP実数', '特防実数', '自分テラスタル', '相手', '相手テラスタル', '相手持ち物', '技', '場の状態', '補正1', '実数値1', '結果1', '補正2', '実数値2', '結果2'];

    let physLineUnique = deduplicateResults(physDefLineResults, defLineHeadersPhys);
    let specLineUnique = deduplicateResults(specDefLineResults, defLineHeadersSpec);

    // We can also reuse smartDeduplicate for Offensive Lines if we wanted, but sticking to existing helper is fine.

    const physLineFiltered = filterRedundantSameResult(physLineUnique);
    const specLineFiltered = filterRedundantSameResult(specLineUnique);

    if (finalAttackResults.length > 0) {
        console.log('[DEBUG] First Attack Detail:', finalAttackResults[0]['詳細']);
    }

    return {
        attack: finalAttackResults,
        defense: {
            physical: finalPhysDefResults,
            special: finalSpecDefResults
        },
        defenseLine: {
            physical: physLineFiltered,
            special: specLineFiltered
        },
        offensiveLine: offensiveLines
    };
}

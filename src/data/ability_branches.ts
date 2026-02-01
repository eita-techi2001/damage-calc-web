
import { MetaPokemonVariant } from '../types';

export interface AbilityBranch {
    description: string; // Suffix for the Pokemon/Scenario name e.g. "(Sun)"
    apply: (variant: MetaPokemonVariant) => void; // Mutate the variant (e.g. set simple field state flags)
}

// Simple configuration for branches
// Note: Actual field application happens in the Calculator/Index or via 'variant.field' property if we add it.
// Currently MetaPokemonVariant does not have 'field'. We might need to extend it or encoded it in the 'description' or a new property.
// Let's assume we can add a 'forceField' or similar property to MetaPokemonVariant, 
// OR we rely on the Calculator to parse the "Scenario" or specific flags.
// 
// EASIEST APPROACH:
// Provide a list of variants where we *manually* adjust properties.
// For Weather/Terrain, we need to ensure the CALCULATOR applies it.
// The Calculator takes `field` arguments.
// If we add `forcedField?: { weather?: string, terrain?: string, isDefenderIntimidated?: boolean, ... }` to MetaPokemonVariant, 
// we can pass it down.

export const AbilityBranches: Record<string, (variant: MetaPokemonVariant) => MetaPokemonVariant[]> = {
    // --- Weather/Terrain Setters ---
    "Grassy Surge": (base) => [
        { ...base, extraLabel: "(グラス)", forcedField: { terrain: "Grassy" } },
        { ...base, extraLabel: "(未発動)" }
    ],
    "Electric Surge": (base) => [
        { ...base, extraLabel: "(エレキ)", forcedField: { terrain: "Electric" } },
        { ...base, extraLabel: "(未発動)" }
    ],
    "Psychic Surge": (base) => [
        { ...base, extraLabel: "(サイコ)", forcedField: { terrain: "Psychic" } },
        { ...base, extraLabel: "(未発動)" }
    ],
    "Misty Surge": (base) => [
        { ...base, extraLabel: "(ミスト)", forcedField: { terrain: "Misty" } },
        { ...base, extraLabel: "(未発動)" }
    ],
    "Drought": (base) => [
        { ...base, extraLabel: "(晴れ)", forcedField: { weather: "Sun" } },
        { ...base, extraLabel: "(なし)" }
    ],
    "Drizzle": (base) => [
        { ...base, extraLabel: "(雨)", forcedField: { weather: "Rain" } },
        { ...base, extraLabel: "(なし)" }
    ],
    "Sand Stream": (base) => [
        { ...base, extraLabel: "(Sand)", forcedField: { weather: "Sand" } },
        { ...base, extraLabel: "(No Sand)" }
    ],
    "Snow Warning": (base) => [
        { ...base, extraLabel: "(Snow)", forcedField: { weather: "Snow" } },
        { ...base, extraLabel: "(No Snow)" }
    ],
    "Hadron Engine": (base) => [
        { ...base, extraLabel: "(発動)", forcedField: { terrain: "Electric" } },
        { ...base, extraLabel: "(未発動)" }
    ],
    "Orichalcum Pulse": (base) => [
        { ...base, extraLabel: "(発動)", forcedField: { weather: "Sun" } },
        { ...base, extraLabel: "(未発動)" }
    ],

    // --- Stat Modifiers / Ability Activation ---
    "Flash Fire": (base) => [
        { ...base, extraLabel: "(発動)", overrides: { abilityOn: true } },
        { ...base, extraLabel: "" }
    ],
    // "Competitive": REMOVED (Stat Rank)
    // "Defiant": REMOVED (Stat Rank)
    // "Justified": REMOVED (Stat Rank)
    // "Moxie": REMOVED (Stat Rank)
    // "Grim Neigh": REMOVED (Stat Rank)
    // "Chilling Neigh": REMOVED (Stat Rank)
    // "Soul-Heart": REMOVED (Stat Rank)
    // "Beast Boost": REMOVED (Stat Rank)

    // --- Status ---
    "Guts": (base) => [
        { ...base, extraLabel: "(発動)", overrides: { abilityOn: true, status: 'brn' } },
        { ...base, extraLabel: "" }
    ],
    "Marvel Scale": (base) => [
        { ...base, extraLabel: "(発動)", overrides: { abilityOn: true, status: 'brn' } },
        { ...base, extraLabel: "" }
    ],
    "Quick Feet": (base) => [
        { ...base, extraLabel: "(発動)", overrides: { abilityOn: true, status: 'brn' } },
        { ...base, extraLabel: "" }
    ],
    "Flare Boost": (base) => [
        { ...base, extraLabel: "(発動)", overrides: { abilityOn: true, status: 'brn' } },
        { ...base, extraLabel: "" }
    ],
    "Toxic Boost": (base) => [
        { ...base, extraLabel: "(発動)", overrides: { abilityOn: true, status: 'psn' } },
        { ...base, extraLabel: "" }
    ],

    // --- Paradox (Item/Field Dependency) ---
    // Note: Protosynthesis/Quark Drive are now "Passive" in logic.ts (calculated based on environment).
    // If we want to force variants, we can. The user instructions said: "Rely on Item/Field".
    // So we do NOT add variants here unless we want to FORCE one.
    // If the User holds Booster Energy, the base variant ALREADY has it.
    // So we don't need branches for Proto/Quark unless we want "Active without Item" (e.g. via Sun).
    // Let's leave them empty to respect "Rely on Item/Field" logic, OR add simple Active/Inactive if no Item.
    // Current logic.ts checks Item/Field.

    // --- Ruins / Intimidate ---
    // User requested these to be "Always Active" (no variants).
    // But for Opponents, we might still want variants?
    // User Instructions: "For User: Intimidate/Ruins always active."
    // For Opponents: We usually want to see "Active" vs "Inactive" to know the threat.
    // But logic.ts logic for "Intimidate Logic" handles the "Active" part.
    // Do we keep branches for Opponents? Yes.
    // But when we use this for USER, we need to handle "Always Active".
    // We can filter the result in logic.ts or define a separate "Always Active" branch here?
    // Actually, logic.ts can just pick the first variant if we don't want branching.
    // But better: Define "Active" as the ONLY variant for these if it's the User?
    // The shared file is used by both.
    // Let's keep the variants for Opponents. logic.ts can choose to ignore the "Inactive" one for the User if desired.
    // Wait, the User said "Intimidate ... always active".
    // So for the USER, we should only use the "Active" variant.

    "Intimidate": (base) => [
        { ...base, extraLabel: "(いかく)", forcedField: { isDefenderIntimidated: true } },
        { ...base, extraLabel: "(未発動)" }
    ],
    "Intrepid Sword": (base) => [
        { ...base, extraLabel: "(A+1)", overrides: { boosts: { atk: 1 } } },
        { ...base, extraLabel: "(未発動)" }
    ],
    "Dauntless Shield": (base) => [
        { ...base, extraLabel: "(B+1)", overrides: { boosts: { def: 1 } } },
        { ...base, extraLabel: "(未発動)" }
    ],
    "Tera Shell": (base) => [
        { ...base, extraLabel: "(HP満タン)" }, // Default state (Full HP)
        { ...base, extraLabel: "(つぶれ)", overrides: { curHP: 1 } } // Damaged state (1 HP)
    ],
    "Multiscale": (base) => [
        { ...base, extraLabel: "(HP満タン)" },
        { ...base, extraLabel: "(マルスなし)", overrides: { curHP: 1 } }
    ],
    "Shadow Shield": (base) => [
        { ...base, extraLabel: "(HP満タン)" },
        { ...base, extraLabel: "(つぶれ)", overrides: { curHP: 1 } }
    ],
    "Teraform Zero": (base) => [
        { ...base, extraLabel: "(発動)", forcedField: { weather: 'None', terrain: 'None' } },
        { ...base, extraLabel: "(未発動)" }
    ]
};

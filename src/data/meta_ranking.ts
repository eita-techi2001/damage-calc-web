
// Valid Items/Abilities for Top Meta Pokemon (Regulation G)
// Key matches the Species name in meta_definitions.ts (to be created from current meta_pokemons.ts)

export interface MetaRanking {
    items: string[];
    // Ability override if needed (usually base is fine, but sometimes varies)
    ability?: string[];
}

export const MetaRankings: Record<string, MetaRanking> = {
    // --- Restricted ---
    "Calyrex-Shadow": {
        items: ["Choice Specs", "Focus Sash", "Life Orb"]
    },
    "Miraidon": {
        items: ["Choice Specs", "Life Orb"]
    },
    "Koraidon": {
        items: ["Clear Amulet", "Life Orb"]
    },
    "Kyogre": {
        items: ["Choice Specs", "Mystic Water", ""]
    },
    "Groudon": {
        items: ["Clear Amulet", "Choice Band", "Assault Vest"]
    },
    "Zacian-Crowned": {
        items: ["Rusted Sword"]
    },
    "Terapagos": {
        items: ["Leftovers", "Choice Specs", "Power Herb"]
    },

    // --- Paradox ---
    "Flutter Mane": {
        items: ["Choice Specs", "Booster Energy", "Focus Sash"]
    },
    "Iron Hands": {
        items: ["Assault Vest", "Booster Energy"]
    },
    "Raging Bolt": {
        items: ["Booster Energy", "Choice Specs", "Assault Vest"]
    },
    "Gouging Fire": {
        items: ["Booster Energy", "Clear Amulet"]
    },
    "Walking Wake": {
        items: ["Choice Specs", "Life Orb"]
    },

    // --- Standard Meta ---
    "Incineroar": {
        items: ["Sitrus Berry", ""]
    },
    "Rillaboom": {
        items: ["Assault Vest", "Choice Band", ""]
    },
    "Urshifu-Rapid-Strike": {
        items: ["Mystic Water", ""]
    },
    "Urshifu": { // Single Strike
        items: ["Choice Band", "Black Glasses", ""]
    },
    "Ogerpon-Hearthflame": {
        items: ["Hearthflame Mask"]
    },
    "Ogerpon-Wellspring": {
        items: ["Wellspring Mask"]
    },
    "Chien-Pao": {
        items: ["Life Orb", ""]
    },
    "Chi-Yu": {
        items: ["Choice Specs", "Choice Scarf", ""]
    },
    "Gholdengo": {
        items: ["Choice Specs", "Leftovers", "Choice Scarf"]
    },
    "Landorus-Therian": {
        items: ["Assault Vest", ""]
    },
    "Tornadus": {
        items: ["Covert Cloak", "Mental Herb", ""]
    },
    "Farigiraf": {
        items: ["Throat Spray", "Sitrus Berry", ""]
    },
    "Ursaluna-Bloodmoon": {
        items: ["Life Orb", "Silk Scarf", "Leftovers"]
    },
    "Amoonguss": {
        items: ["Sitrus Berry", ""]
    },
    "Dragonite": {
        items: ["Choice Band", ""]
    },
    "Kingambit": {
        items: ["Black Glasses", "Assault Vest", "Leftovers"]
    },
    "Torkoal": {
        items: ["Charcoal", "Sitrus Berry", ""]
    },
    "Annihilape": {
        items: ["Leftovers", ""]
    },
    "Whimsicott": {
        items: ["Covert Cloak", ""]
    },
    "Pelipper": {
        items: ["Damp Rock", ""]
    },
    "Landorus": {
        items: ["Life Orb", "Choice Specs"]
    },
    "Grimmsnarl": {
        items: [""]
    }
};

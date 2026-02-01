
// Valid Items/Abilities for Top Meta Pokemon (Regulation G)
// Key matches the Species name in meta_definitions.ts

export interface MetaRanking {
    items: string[];
    // Ability override if needed (usually base is fine, but sometimes varies)
    ability?: string[];
}

export const MetaRankings: Record<string, MetaRanking> = {
    // --- User Specified Configs ---
    "Incineroar": {
        items: ["Sitrus Berry", ""] // Sitrus and None
    },
    "Rillaboom": {
        items: ["Assault Vest", ""] // AV and None
    },
    "Urshifu-Rapid-Strike": {
        items: ["Mystic Water", ""] // Mystic Water and None
    },
    "Flutter Mane": {
        items: ["Booster Energy", "Choice Specs"] // Booster and Specs
    },
    "Chien-Pao": {
        items: [""] // None only
    },
    "Chi-Yu": {
        items: [""] // None only
    },
    "Landorus": {
        items: ["Life Orb"] // Life Orb
    },
    "Raging Bolt": {
        items: ["Leftovers"] // Leftovers
    },

    // Note: Dragonite is intentionally OMITTED here.
    // We want Dragonite(Multiscale) to use its default item (None).
    // We want Dragonite(Inner Focus) to use its default item (Choice Band).
    // If we included "Dragonite" here, specific defaults in definitions would be overridden/duplicated.

    // --- Preserved Legendaries ---
    "Calyrex-Shadow": {
        items: ["Choice Specs", "Focus Sash", "Life Orb"]
    },
    "Calyrex-Ice": {
        items: ["Clear Amulet", "Never-Melt Ice"]
    },
    "Miraidon": {
        items: ["Choice Specs", "Life Orb"] // Default
    },
    "Koraidon": {
        items: ["Clear Amulet", "Life Orb"] // Default
    }
    // Removed others (Kyogre, Groudon, Zacian, Terapagos etc.) as per request to "remove defaults"
};

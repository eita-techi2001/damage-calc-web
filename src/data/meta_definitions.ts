
import { MetaPokemonVariant } from '../types';

export const MetaDefinitions: MetaPokemonVariant[] = [
    // --- User Specified Keepers ---
    {
        species: "Incineroar",
        item: "Sitrus Berry",
        nature: "Careful",
        ability: "Intimidate",
        evs: { hp: 252, atk: 0, def: 156, spa: 0, spd: 100, spe: 0 },
        moves: ["Fake Out", "Knock Off", "Flare Blitz", "Parting Shot"],
        teraType: "Grass"
    },
    {
        species: "Rillaboom",
        item: "Assault Vest",
        nature: "Adamant",
        ability: "Grassy Surge",
        evs: { hp: 252, atk: 116, def: 4, spa: 0, spd: 60, spe: 76 },
        moves: ["Grassy Glide", "Wood Hammer", "High Horsepower", "U-turn"],
        teraType: "Fire"
    },
    {
        species: "Urshifu-Rapid-Strike",
        item: "Mystic Water",
        nature: "Adamant", // Common
        ability: "Unseen Fist",
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        moves: ["Surging Strikes", "Aqua Jet", "Close Combat", "U-turn"],
        teraType: "Water"
    },
    {
        species: "Flutter Mane",
        item: "Booster Energy",
        nature: "Timid", // Common for Booster
        ability: "Protosynthesis",
        evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
        moves: ["Moonblast", "Shadow Ball", "Dazzling Gleam", "Protect"],
        teraType: "Fairy"
    },
    {
        species: "Chien-Pao",
        item: "",
        nature: "Jolly",
        ability: "Sword of Ruin",
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        moves: ["Icicle Crash", "Sucker Punch", "Sacred Sword", "Protect"],
        teraType: "Stellar"
    },
    {
        species: "Chi-Yu",
        item: "",
        nature: "Modest",
        ability: "Beads of Ruin",
        evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
        moves: ["Heat Wave", "Dark Pulse", "Snarl", "Protect"],
        teraType: "Ghost"
    },
    {
        species: "Landorus", // Incarnate
        item: "Life Orb",
        nature: "Timid",
        ability: "Sheer Force",
        evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
        moves: ["Earth Power", "Sludge Bomb", "Sandsear Storm", "Protect"],
        teraType: "Poison" // Common for Lando-I, or User Default? User didn't specify Tera. Defaulting to safe Poison or Ground.
    },
    {
        species: "Raging Bolt",
        item: "Leftovers",
        nature: "Modest",
        ability: "Protosynthesis",
        evs: { hp: 252, atk: 0, def: 0, spa: 252, spd: 0, spe: 4 }, // Bulkier standard
        moves: ["Thunderclap", "Dragon Pulse", "Calm Mind", "Protect"],
        teraType: "Electric"
    },

    // --- Dragonite Variants (Split) ---
    // 1. Multiscale (Scale Shot, ESpeed)
    {
        species: "Dragonite",
        item: "", // User didn't specify item, implying None/Flexible
        nature: "Adamant",
        ability: "Multiscale",
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        moves: ["Scale Shot", "Extreme Speed", "Low Kick", "Protect"],
        teraType: "Normal"
    },
    // 2. Inner Focus (Choice Band)
    {
        species: "Dragonite",
        item: "Choice Band",
        nature: "Adamant",
        ability: "Inner Focus",
        evs: { hp: 196, atk: 252, def: 4, spa: 0, spd: 4, spe: 52 }, // Bulkier Band build
        moves: ["Extreme Speed", "Outrage", "Stomping Tantrum", "Iron Head"], // User specified: ESpeed, Outrage, Tantrum
        teraType: "Normal",
        extraLabel: "(精神力)" // distinguish in UI if needed, though Ability label handles it
    },

    // --- Preserved Legendaries (Previous Default) ---
    {
        species: "Calyrex-Shadow",
        item: "Choice Specs",
        nature: "Timid",
        ability: "As One (Spectrier)",
        evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
        moves: ["Astral Barrage", "Psychic", "Draining Kiss"],
        teraType: "Fairy"
    },
    {
        species: "Calyrex-Ice",
        item: "Clear Amulet",
        nature: "Adamant",
        ability: "As One (Glastrier)",
        evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 },
        moves: ["Glacial Lance", "High Horsepower", "Trick Room"],
        teraType: "Fire"
    },
    {
        species: "Miraidon",
        item: "Choice Specs",
        nature: "Timid",
        ability: "Hadron Engine",
        evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
        moves: ["Electro Drift", "Draco Meteor", "Dazzling Gleam", "Volt Switch"],
        teraType: "Fairy"
    },
    {
        species: "Koraidon",
        item: "Clear Amulet",
        nature: "Adamant",
        ability: "Orichalcum Pulse",
        evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 },
        moves: ["Collision Course", "Flare Blitz", "Scale Shot"],
        teraType: "Fire"
    }
];

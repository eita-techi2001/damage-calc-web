
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to sanitize filename
const toID = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

const MetaDefinitions = [
    {
        species: "Incineroar",
        item: "Sitrus Berry",
        nature: "Careful",
        ability: "Intimidate",
        evs: { hp: 252, atk: 0, def: 156, spa: 0, spd: 100, spe: 0 },
        moves: ["Fake Out", "Knock Off", "Flare Blitz"],
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
        item: "Choice Scarf",
        nature: "Adamant",
        ability: "Unseen Fist",
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        moves: ["Surging Strikes", "Aqua Jet", "Close Combat", "U-turn"],
        teraType: "Water"
    },
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
    },
    {
        species: "Kyogre",
        item: "Choice Scarf",
        nature: "Modest",
        ability: "Drizzle",
        evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
        moves: ["Water Spout", "Origin Pulse", "Ice Beam"],
        teraType: "Grass"
    },
    {
        species: "Groudon",
        item: "Clear Amulet",
        nature: "Adamant",
        ability: "Drought",
        evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 },
        moves: ["Precipice Blades", "Heat Crash"],
        teraType: "Fire"
    },
    {
        species: "Zacian-Crowned",
        item: "Rusted Sword",
        nature: "Adamant",
        ability: "Intrepid Sword",
        evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        moves: ["Behemoth Blade", "Play Rough", "Sacred Sword"],
        teraType: "Stellar"
    },
    {
        species: "Terapagos",
        item: "Leftovers",
        nature: "Modest",
        ability: "Tera Shift",
        evs: { hp: 252, atk: 0, def: 0, spa: 252, spd: 0, spe: 4 },
        moves: ["Tera Starstorm", "Earth Power"],
        teraType: "Stellar"
    },
    {
        species: "Flutter Mane",
        item: "Choice Specs",
        nature: "Timid",
        ability: "Protosynthesis",
        evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
        moves: ["Moonblast", "Shadow Ball", "Dazzling Gleam", "Icy Wind"],
        teraType: "Fairy"
    },
    {
        species: "Ogerpon-Hearthflame",
        item: "Hearthflame Mask",
        nature: "Adamant",
        ability: "Mold Breaker",
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        moves: ["Ivy Cudgel", "Wood Hammer", "Horn Leech"],
        teraType: "Fire"
    },
    {
        species: "Urshifu",
        item: "Focus Sash",
        nature: "Adamant",
        ability: "Unseen Fist",
        evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        moves: ["Wicked Blow", "Close Combat", "Sucker Punch"],
        teraType: "Dark"
    },
    {
        species: "Chien-Pao",
        item: "Focus Sash",
        nature: "Jolly",
        ability: "Sword of Ruin",
        evs: { hp: 0, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        moves: ["Icicle Crash", "Sucker Punch", "Sacred Sword"],
        teraType: "Ghost"
    },
    {
        species: "Chi-Yu",
        item: "Choice Specs",
        nature: "Modest",
        ability: "Beads of Ruin",
        evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
        moves: ["Heat Wave", "Dark Pulse", "Snarl"],
        teraType: "Ghost"
    },
    {
        species: "Raging Bolt",
        item: "Booster Energy",
        nature: "Modest",
        ability: "Protosynthesis",
        evs: { hp: 252, atk: 0, def: 0, spa: 252, spd: 0, spe: 0 },
        moves: ["Thunderclap", "Draco Meteor", "Thunderbolt"],
        teraType: "Electric"
    },
    {
        species: "Gouging Fire",
        item: "Booster Energy",
        nature: "Adamant",
        ability: "Protosynthesis",
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        moves: ["Heat Crash", "Dragon Claw", "Flare Blitz"],
        teraType: "Ground"
    },
    {
        species: "Iron Hands",
        item: "Assault Vest",
        nature: "Adamant",
        ability: "Quark Drive",
        evs: { hp: 4, atk: 252, def: 100, spa: 0, spd: 152, spe: 0 },
        moves: ["Wild Charge", "Drain Punch", "Heavy Slam", "Fake Out"],
        teraType: "Grass"
    },
    {
        species: "Gholdengo",
        item: "Choice Specs",
        nature: "Modest",
        ability: "Good as Gold",
        evs: { hp: 100, atk: 0, def: 0, spa: 252, spd: 0, spe: 156 },
        moves: ["Make It Rain", "Shadow Ball"],
        teraType: "Steel"
    },
    {
        species: "Landorus-Therian",
        item: "Choice Scarf",
        nature: "Adamant",
        ability: "Intimidate",
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        moves: ["Stomping Tantrum", "Rock Slide", "U-turn"],
        teraType: "Flying"
    },
    {
        species: "Tornadus",
        item: "Covert Cloak",
        nature: "Timid",
        ability: "Prankster",
        evs: { hp: 252, atk: 0, def: 0, spa: 100, spd: 0, spe: 156 },
        moves: ["Bleakwind Storm", "Icy Wind"],
        teraType: "Ghost"
    },
    {
        species: "Farigiraf",
        item: "Throat Spray",
        nature: "Modest",
        ability: "Armor Tail",
        evs: { hp: 252, atk: 0, def: 100, spa: 156, spd: 0, spe: 0 },
        moves: ["Hyper Voice", "Psychic Noise"],
        teraType: "Fairy"
    },
    {
        species: "Ursaluna-Bloodmoon",
        item: "Life Orb",
        nature: "Modest",
        ability: "Mind's Eye",
        evs: { hp: 252, atk: 0, def: 0, spa: 252, spd: 4, spe: 0 },
        moves: ["Blood Moon", "Earth Power", "Hyper Voice"],
        teraType: "Normal"
    },
    {
        species: "Amoonguss",
        item: "Rocky Helmet",
        nature: "Sassy",
        ability: "Regenerator",
        evs: { hp: 252, atk: 0, def: 156, spa: 0, spd: 100, spe: 0 },
        moves: ["Sludge Bomb", "Pollen Puff"],
        teraType: "Water"
    },
    {
        species: "Ogerpon-Wellspring",
        item: "Wellspring Mask",
        nature: "Jolly",
        ability: "Water Absorb",
        evs: { hp: 252, atk: 100, def: 100, spa: 0, spd: 0, spe: 56 },
        moves: ["Ivy Cudgel", "Horn Leech", "Wood Hammer"],
        teraType: "Water"
    },
    {
        species: "Dragonite",
        item: "Choice Band",
        nature: "Adamant",
        ability: "Inner Focus",
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        moves: ["Extreme Speed", "Stomping Tantrum"],
        teraType: "Normal"
    },
    {
        species: "Kingambit",
        item: "Black Glasses",
        nature: "Adamant",
        ability: "Defiant",
        evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 },
        moves: ["Sucker Punch", "Kowtow Cleave", "Iron Head"],
        teraType: "Dark"
    },
    {
        species: "Torkoal",
        item: "Charcoal",
        nature: "Quiet",
        ability: "Drought",
        evs: { hp: 252, atk: 0, def: 0, spa: 252, spd: 4, spe: 0 },
        moves: ["Eruption", "Heat Wave"],
        teraType: "Fire"
    },
    {
        species: "Annihilape",
        item: "Leftovers",
        nature: "Careful",
        ability: "Defiant",
        evs: { hp: 252, atk: 4, def: 100, spa: 0, spd: 152, spe: 0 },
        moves: ["Rage Fist", "Drain Punch"],
        teraType: "Water"
    },
    {
        species: "Whimsicott",
        item: "Focus Sash",
        nature: "Timid",
        ability: "Prankster",
        evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
        moves: ["Moonblast"],
        teraType: "Ghost"
    },
    {
        species: "Landorus",
        item: "Life Orb",
        nature: "Timid",
        ability: "Sheer Force",
        evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
        moves: ["Earth Power", "Sludge Bomb", "Sandsear Storm"],
        teraType: "Poison"
    },
    {
        species: "Grimmsnarl",
        item: "Light Clay",
        nature: "Careful",
        ability: "Prankster",
        evs: { hp: 252, atk: 0, def: 100, spa: 0, spd: 156, spe: 0 },
        moves: ["Spirit Break", "Sucker Punch"],
        teraType: "Steel"
    }
];

const main = () => {
    const outputDir = path.join(__dirname, '../src/configs/pokemons');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    let count = 0;

    for (const def of MetaDefinitions) {
        const id = toID(def.species);
        const filename = `${id}.json`;
        const filePath = path.join(outputDir, filename);

        const config = {
            species: def.species,
            level: 50,
            nature: def.nature || 'Serious',
            ability: def.ability || '',
            item: def.item || '',
            evs: def.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            teraType: def.teraType || 'Stellar',
            moves: def.moves || []
        };

        fs.writeFileSync(filePath, JSON.stringify(config, null, 4));
        count++;
    }

    console.log(`Successfully synchronized ${count} Pokemon configs.`);
};

main();

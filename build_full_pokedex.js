const fs = require('fs');
const https = require('https');

const url = 'https://play.pokemonshowdown.com/data/pokedex.js';

const fetchText = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => resolve(data));
        res.on('error', reject);
    });
});

(async () => {
    try {
        console.log('Fetching Pokedex.js...');
        let text = await fetchText(url);

        // it assigns to exports.BattlePokedex = ...
        // We want to extract the object.
        // Simple hack: mock 'exports' and eval? 
        // Or regex replace?
        // Let's create a temporary context.

        const BattlePokedex = {};
        const exports = { BattlePokedex };

        // Remove "use strict" or other global artifacts if needed.
        // The file usually starts with `'use strict';`

        // Eval is risky but for build script it's fine.
        // However, it might contain logic? Usually just data.
        // It's a huge object.

        // Let's rely on node's `vm` module or just simpler replacement.
        // "exports.BattlePokedex =" replace with "const dex ="

        // Actually, let's just use eval in a sandbox.
        // But `text` contains "exports.BattlePokedex = {...};"

        eval(text);
        // Now exports.BattlePokedex is populated.

        const dex = exports.BattlePokedex;
        console.log(`Loaded ${Object.keys(dex).length} entries.`);

        // Build our schema: { species (Key), abilities: [] }
        // Note: keys in showdown dex are lowercasenospaces (incineroar).
        // stored 'name' field is "Incineroar".

        const output = {};
        for (const key in dex) {
            const entry = dex[key];
            if (entry.name && entry.abilities) {
                output[entry.name] = {
                    abilities: entry.abilities, // keys 0, 1, H, S
                    types: entry.types,
                    baseStats: entry.baseStats
                };
            }
        }

        fs.writeFileSync('src/data/pokemon_data_full.json', JSON.stringify(output, null, 2));
        console.log('Saved src/data/pokemon_data_full.json');

    } catch (e) {
        console.error(e);
    }
})();

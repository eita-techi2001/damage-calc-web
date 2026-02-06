const fs = require('fs');
const https = require('https');

const url = 'https://raw.githubusercontent.com/veekun/pokedex/master/pokedex/data/csv/ability_names.csv';

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
        console.log('Fetching ability_names.csv...');
        const csv = await fetchText(url);

        const lines = csv.split('\n');
        const map = {}; // id -> { en, ja }

        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            // assumption: format is ability_id,local_language_id,name
            const parts = line.split(',');
            if (parts.length < 3) continue;

            const id = parts[0];
            const lang = parts[1];
            const name = parts[2]; // Might have comma? Veekun data usually simple. 
            // Actually Veekun CSVs are usually strictly formatted.

            if (!map[id]) map[id] = {};
            if (lang === '9') map[id].en = name; // English
            if (lang === '1') map[id].ja = name; // Japanese (Kana/Kanji depends on Veekun)
        }

        const list = [];
        for (const id in map) {
            const entry = map[id];
            if (entry.en && entry.ja) {
                list.push({
                    english: entry.en,
                    japanese: entry.ja
                });
            }
        }

        console.log(`Found ${list.length} translated abilities.`);
        fs.writeFileSync('src/data/abilities_multilang.json', JSON.stringify(list, null, 2));
        console.log('Done.');
    } catch (e) {
        console.error(e);
    }
})();

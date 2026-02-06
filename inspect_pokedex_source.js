const https = require('https');

const url = 'https://raw.githubusercontent.com/fanzeyi/pokemon.json/master/pokedex.json';

const fetchJson = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => resolve(JSON.parse(data)));
        res.on('error', reject);
    });
});

(async () => {
    const data = await fetchJson(url);
    const bulbasaur = data.find(p => p.id === 1);
    const incineroar = data.find(p => p.name.english === 'Incineroar');

    console.log('Bulbasaur:', JSON.stringify(bulbasaur, null, 2));
})();

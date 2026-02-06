
const https = require('https');

const url = 'https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/en.json';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        console.log(`Total entries: ${json.length}`);
        console.log(`Last 5: ${JSON.stringify(json.slice(-5))}`);
    });
});

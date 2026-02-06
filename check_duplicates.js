const list = require('./src/data/pokedex_multilang.json');

// Check Sort
let sorted = true;
// We don't have ID in the json output yet, so we can't strict check ID order, 
// but we can check if it looks roughly ordered or random.
// Actually, I'll check duplicates first.

const nameCounts = {};
list.forEach(i => {
    const ja = i.name.japanese;
    nameCounts[ja] = (nameCounts[ja] || 0) + 1;
});

const duplicates = Object.entries(nameCounts).filter(([k, v]) => v > 1);
console.log('Duplicate Japanese Names:', duplicates.length);
duplicates.slice(0, 20).forEach(([k, v]) => console.log(`${k}: ${v}`));

// Check English Duplicates just in case
const engCounts = {};
list.forEach(i => {
    const en = i.name.english;
    engCounts[en] = (engCounts[en] || 0) + 1;
});
const enDuplicates = Object.entries(engCounts).filter(([k, v]) => v > 1);
console.log('Duplicate English Names:', enDuplicates.length);

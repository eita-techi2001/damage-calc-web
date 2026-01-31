
const fs = require('fs');
const path = require('path');

const mainFile = path.join(__dirname, 'moves_multilang.json');
const supplementFile = path.join(__dirname, 'moves_supplement.json');

try {
    let mainData = [];
    if (fs.existsSync(mainFile)) {
        mainData = JSON.parse(fs.readFileSync(mainFile, 'utf8'));
    }

    const supplementData = JSON.parse(fs.readFileSync(supplementFile, 'utf8'));

    // Create a map for easier merging (Key: lowercase ename)
    const moveMap = new Map();
    mainData.forEach(m => moveMap.set(m.ename.toLowerCase(), m));

    // Upsert supplement data
    supplementData.forEach(m => {
        moveMap.set(m.ename.toLowerCase(), m);
    });

    // Convert back to array
    const merged = Array.from(moveMap.values());
    merged.sort((a, b) => a.ename.localeCompare(b.ename));

    fs.writeFileSync(mainFile, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`Merged complete. Total moves: ${merged.length}`);

} catch (e) {
    console.error('Error merging:', e);
}

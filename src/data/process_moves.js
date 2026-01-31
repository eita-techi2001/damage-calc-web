
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, 'temp_moves.json');
const outputFile = path.join(__dirname, 'moves_multilang.json');

try {
    const rawData = fs.readFileSync(inputFile, 'utf8');
    const moves = JSON.parse(rawData);

    const processed = moves.map(m => {
        if (m.ename && m.jname) {
            return {
                ename: m.ename,
                jname: m.jname
            };
        }
        return null;
    }).filter(m => m !== null);

    // Sort alphabetically by English name for easier manual inspection if needed
    processed.sort((a, b) => a.ename.localeCompare(b.ename));

    fs.writeFileSync(outputFile, JSON.stringify(processed, null, 2), 'utf8');
    console.log(`Successfully processed ${processed.length} moves.`);

    // Check specific moves
    const checkList = ['Lash Out', 'Life Dew', 'Glacial Lance', 'Expanding Force', 'Body Press'];
    checkList.forEach(name => {
        const found = processed.find(m => m.ename.toLowerCase() === name.toLowerCase());
        if (found) {
            console.log(`Found: ${name} -> ${found.jname}`);
        } else {
            console.log(`MISSING: ${name}`);
        }
    });

} catch (e) {
    console.error('Error processing moves:', e);
}

const list = require('./src/data/pokedex_multilang.json');
const untranslated = list.filter(i => i.name.english === i.name.japanese || /^[A-Za-z\s-()]+$/.test(i.name.japanese));
console.log('Untranslated count:', untranslated.length);
untranslated.forEach(i => console.log(i.name.english, '->', i.name.japanese));

const megas = list.filter(i => i.name.english.includes('-Mega'));
console.log('Mega count:', megas.length);

const gmax = list.filter(i => i.name.english.includes('-Gmax'));
console.log('Gmax count:', gmax.length);

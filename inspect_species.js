const { Generations } = require('@smogon/calc');
const gen = Generations.get(9);

const list = [];
for (const s of gen.species) {
    if (s.isNonstandard === 'CAP') {
        list.push(s.name);
    }
}
console.log(JSON.stringify(list));

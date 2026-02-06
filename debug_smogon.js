
const { Generations } = require('@smogon/calc');
const gen = Generations.get(9);
const mon = gen.species.get('Flutter Mane');
console.log(JSON.stringify(mon, null, 2));

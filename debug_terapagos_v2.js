
const { Generations, Pokemon } = require('@smogon/calc');
const gen = Generations.get(9);

const normal = new Pokemon(gen, 'Terapagos');
const terastal = new Pokemon(gen, 'Terapagos-Terastal');
const stellar = new Pokemon(gen, 'Terapagos-Stellar');

console.log('Normal:', JSON.stringify(normal.species.baseStats));
console.log('Terastal:', JSON.stringify(terastal.species.baseStats));
console.log('Stellar:', JSON.stringify(stellar.species.baseStats));

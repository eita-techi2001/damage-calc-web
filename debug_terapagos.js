
const { Generations, Pokemon } = require('@smogon/calc');
const gen = Generations.get(9);

const normal = new Pokemon(gen, 'Terapagos');
const terastal = new Pokemon(gen, 'Terapagos-Terastal');
const stellar = new Pokemon(gen, 'Terapagos-Stellar');

console.log('Terapagos (Base):', normal.species.baseStats);
console.log('Terapagos-Terastal:', terastal.species.baseStats);
console.log('Terapagos-Stellar:', stellar.species.baseStats);

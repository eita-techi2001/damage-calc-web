const fs = require('fs');
const { Generations, Pokemon } = require('@smogon/calc');

const gen = Generations.get(9);

function check(species) {
    const p = new Pokemon(gen, species);
    return {
        species: species,
        abilities: p.species.abilities,
        values: Object.values(p.species.abilities)
    };
}

const results = [
    check('Incineroar'),
    check('Meowscarada'),
    check('Dragonite')
];

fs.writeFileSync('debug_out.txt', JSON.stringify(results, null, 2));
console.log('Done writing debug_out.txt');

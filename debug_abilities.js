const { Generations, Pokemon } = require('@smogon/calc');

const gen = Generations.get(9);

function check(species) {
    const p = new Pokemon(gen, species);
    console.log(`Species: ${species}`);
    console.log('Abilities Object:', p.species.abilities);
    console.log('Object.values:', Object.values(p.species.abilities));
    console.log('---');
}

check('Farigiraf'); // Has Armor Tail (H)
check('Dragonite');  // Has Multiscale (H)
check('Meowscarada');
check('Incineroar');

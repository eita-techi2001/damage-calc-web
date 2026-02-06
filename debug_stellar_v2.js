
const { calculate, Generations, Pokemon, Move } = require('@smogon/calc');
const gen = Generations.get(9);

// Attacker: Sylveon (Fairy)
// Moves: Hyper Voice (Fairy, STAB), Psyshock (Psychic, Non-STAB)
const attacker = new Pokemon(gen, 'Sylveon', {
    level: 50,
    evs: { spa: 252 },
    nature: 'Modest'
});

const attackerTera = new Pokemon(gen, 'Sylveon', {
    level: 50,
    evs: { spa: 252 },
    nature: 'Modest',
    teraType: 'Stellar'
});

const defender = new Pokemon(gen, 'Mew', { level: 50, evs: { hp: 252, spd: 0 } });

const hyperVoice = new Move(gen, 'Hyper Voice');
const psyshock = new Move(gen, 'Psyshock');

console.log('--- Hyper Voice (Fairy) ---');
const resVoiceBase = calculate(gen, attacker, defender, hyperVoice);
const resVoiceTera = calculate(gen, attackerTera, defender, hyperVoice);
console.log(`Base: ${resVoiceBase.range()}`);
console.log(`Tera: ${resVoiceTera.range()}`);
console.log(`Max Diff: ${resVoiceTera.range()[1] - resVoiceBase.range()[1]}`);

console.log('--- Psyshock (Psychic) ---');
const resShockBase = calculate(gen, attacker, defender, psyshock);
const resShockTera = calculate(gen, attackerTera, defender, psyshock);
console.log(`Base: ${resShockBase.range()}`);
console.log(`Tera: ${resShockTera.range()}`);
console.log(`Max Diff: ${resShockTera.range()[1] - resShockBase.range()[1]}`);

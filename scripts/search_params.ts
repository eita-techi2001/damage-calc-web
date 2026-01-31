
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';

const gen = Generations.get(9);
const move = new Move(gen, 'Collision Course');
const fieldSun = new Field({ weather: 'Sun' });

const atk = 205;
console.log(`Starting Targeted Search (Atk ${atk})...`);

for (let def = 130; def <= 150; def++) {
    const koraidon = new Pokemon(gen, 'Koraidon', {
        level: 50, nature: 'Adamant', evs: { atk: 252 },
        boosts: { atk: -1 }
    });
    koraidon.stats.atk = atk;

    const incineroar = new Pokemon(gen, 'Incineroar', {
        level: 50, item: 'Sitrus Berry', nature: 'Bold', evs: { hp: 252 }
    });
    incineroar.stats.hp = 202;
    incineroar.stats.def = def;

    const res = calculate(gen, koraidon, incineroar, move, fieldSun);
    const [min, max] = res.range();
    console.log(`Def: ${def} -> Range: ${min}-${max}`);
}

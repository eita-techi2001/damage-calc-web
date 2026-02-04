
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';

const gen = Generations.get(9);

function verifySkillLink() {
    console.log("Verifying Skill Link Behavior...");

    const attacker = new Pokemon(gen, 'Cinccino', {
        ability: 'Skill Link',
        level: 50,
        evs: { atk: 252 }
    });

    const defender = new Pokemon(gen, 'Mew', {
        level: 50,
        evs: { hp: 252 }
    });

    // Bullet Seed is a 2-5 hit move
    const move = new Move(gen, 'Bullet Seed');

    const result = calculate(gen, attacker, defender, move, new Field());

    console.log(`Move: ${move.name}`);
    console.log(`Attacker Ability: ${attacker.ability}`);
    // Check generated hits. Note: @smogon/calc might not expose 'hits' on result directly if implied, 
    // but specific damage calculation usually iterates. 
    // However, for Multi-Hit moves, 'result.damage' is usually an array of total damages? 
    // Or does it return ranges?
    // Let's check the description.
    console.log(`Description: ${result.desc()}`);
}

verifySkillLink();


import { Generations, Pokemon } from '@smogon/calc';

try {
    console.log("Initializing Gen 9...");
    const gen = Generations.get(9);
    console.log("Gen 9 initialized.");

    console.log("Creating Incineroar...");
    const p = new Pokemon(gen, "Incineroar");
    console.log("Incineroar created successfully.");
    console.log("Species:", p.species.name);

    // Check if accessing megaEvolves works
    // Note: megaEvolves is not on Pokemon, but on Species?
    // In smogon/calc, p.species might be the Species object.
    // Let's check it.
    console.log("MegaEvolves check:", (p.species as any).megaEvolves);

} catch (e: any) {
    console.error("CRITICAL ERROR:", e);
    if (e.stack) console.error(e.stack);
}

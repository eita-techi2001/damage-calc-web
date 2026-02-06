
import { MetaDefinitions } from './meta_definitions';
import { MetaRankings } from './meta_ranking';
import { AbilityBranches } from './ability_branches'; // New import
import { MetaPokemonVariant } from '../types';

function generateMeta(): MetaPokemonVariant[] {
    const expandedList: MetaPokemonVariant[] = [];

    for (const def of MetaDefinitions) {
        const ranking = MetaRankings[def.species];
        const items = (ranking && ranking.items && ranking.items.length > 0) ? ranking.items : [def.item];

        // Create base variants for each item
        let itemVariants: MetaPokemonVariant[] = [];
        for (const item of items) {
            const variant: MetaPokemonVariant = {
                ...def,
                item: item,
            };
            itemVariants.push(variant);
        }

        // Apply Ability Branching
        // Check if the definition's ability has branching rules
        const branchFn = AbilityBranches[def.ability];

        if (branchFn) {
            // Expand each item variant into ability branches
            const branchedVariants: MetaPokemonVariant[] = [];
            for (const v of itemVariants) {
                // branchFn returns an array of variants (e.g. Active / Inactive)
                const branches = branchFn(v);
                branchedVariants.push(...branches);
            }
            // Replace itemVariants with the branched ones
            itemVariants = branchedVariants;
        }

        expandedList.push(...itemVariants);
    }

    return expandedList;
}

export const MetaPokemons = generateMeta();

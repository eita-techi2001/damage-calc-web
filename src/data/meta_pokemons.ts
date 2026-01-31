
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
            // Generate a unique Group ID for this specific Spec (Species + Item context)
            // This allows us to link "Active" and "Inactive" states together for deletion.
            const groupId = `${def.species}-${item}-${Math.random().toString(36).substr(2, 9)}`;

            const variant: MetaPokemonVariant = {
                ...def,
                item: item,
                groupId: groupId // Assign Group ID
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
                // Ensure branches inherit the groupId
                const linkedBranches = branches.map(b => ({ ...b, groupId: v.groupId }));
                branchedVariants.push(...linkedBranches);
            }
            // Replace itemVariants with the branched ones
            itemVariants = branchedVariants;
        }

        expandedList.push(...itemVariants);
    }

    return expandedList;
}

export const MetaPokemons = generateMeta();

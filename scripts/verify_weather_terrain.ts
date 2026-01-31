
import { calculateDamageForConfig } from '../src/lib/logic';
import { UserPokemonConfig, GlobalFieldState } from '../src/types';

// Mock Configs
const kyogreConfig: UserPokemonConfig = {
    species: 'Kyogre',
    ability: 'Drizzle',
    item: '',
    nature: 'Modest',
    evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    moves: ['Water Spout'],
    teraType: 'Water'
};

const miraidonConfig: UserPokemonConfig = {
    species: 'Miraidon',
    ability: 'Hadron Engine',
    item: '',
    nature: 'Modest',
    evs: { hp: 0, atk: 0, def: 0, spa: 252, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    moves: ['Electro Drift'],
    teraType: 'Electric'
};

async function runVerification() {
    console.log('=== Verifying Weather & Terrain Logic ===\n');

    // --- Test Case 1: Weather (Kyogre) ---
    console.log('--- Test 1: Weather Priority (Manual > Ability) ---');

    // 1a. Default (Ability: Drizzle -> Rain)
    const fieldNone: GlobalFieldState = {
        weather: 'None',
        terrain: 'None',
        userSide: { isReflect: false, isLightScreen: false, isFriendGuard: false, isHelpingHand: false },
        opponentSide: { isReflect: false, isLightScreen: false, isFriendGuard: false },
        global: { isSwordOfRuin: false, isBeadsOfRuin: false, isTabletsOfRuin: false, isVesselOfRuin: false }
    };

    try {
        const resRain = await calculateDamageForConfig(kyogreConfig, fieldNone);
        console.log(`[DEBUG] resRain length: ${resRain ? resRain.length : 'undefined'}`);

        if (!resRain || resRain.length === 0) {
            console.error('Error: No results returned for Default Rain.');
            // Skip damage check if no results
        } else {
            console.log(`[DEBUG] resRain[0] keys: ${Object.keys(resRain[0])}`);
            if (resRain[0]['_meta']) {
                const dmgRain = resRain[0]['_meta'].maxDmg;
                console.log(`[Kyogre] Manual 'None' (Drizzle): ${dmgRain}`);

                // 1b. Manual Sun (Override)
                const fieldSun: GlobalFieldState = { ...fieldNone, weather: 'Sun' };
                const resSun = await calculateDamageForConfig(kyogreConfig, fieldSun);
                console.log(`[DEBUG] resSun length: ${resSun ? resSun.length : 'undefined'}`);

                if (!resSun || resSun.length === 0) {
                    console.error('Error: No results returned for Manual Sun.');
                } else {
                    const dmgSun = resSun[0]['_meta'].maxDmg;
                    console.log(`[Kyogre] Manual 'Sun': ${dmgSun}`);

                    if (dmgRain > dmgSun) {
                        console.log('✅ PASS: Rain damage is higher than Sun damage (Drizzle worked vs Override worked).');
                    } else {
                        console.error('❌ FAIL: Rain damage is NOT higher than Sun damage.');
                        console.error(`Rain: ${dmgRain}, Sun: ${dmgSun}`);
                    }
                }
            } else {
                console.error('Error: _meta missing in resRain[0]');
            }
        }
    } catch (e) {
        console.error('Execution Error (Weather):', e);
    }

    // --- Test Case 2: Terrain (Miraidon) ---
    console.log('\n--- Test 2: Terrain Priority (Manual > Ability) ---');

    try {
        // 2a. Default (Ability: Hadron Engine -> Electric Terrain)
        const resElectric = await calculateDamageForConfig(miraidonConfig, fieldNone);

        if (!resElectric || resElectric.length === 0) {
            console.error('Error: No results for Electric.');
        } else {
            const dmgElectric = resElectric[0]['_meta'].maxDmg;
            console.log(`[Miraidon] Manual 'None' (Hadron Engine): ${dmgElectric}`);

            // 2b. Manual Grassy Match (Override)
            const fieldGrassy: GlobalFieldState = { ...fieldNone, terrain: 'Grassy' };
            const resGrassy = await calculateDamageForConfig(miraidonConfig, fieldGrassy);

            if (!resGrassy || resGrassy.length === 0) {
                console.error('Error: No results for Grassy.');
            } else {
                const dmgGrassy = resGrassy[0]['_meta'].maxDmg;
                console.log(`[Miraidon] Manual 'Grassy': ${dmgGrassy}`);

                if (dmgElectric > dmgGrassy) {
                    console.log('✅ PASS: Electric Terrain damage is higher than Grassy Terrain damage.');
                } else {
                    console.error('❌ FAIL: Electric Terrain damage is NOT higher than Grassy Terrain damage.');
                    console.error(`Electric: ${dmgElectric}, Grassy: ${dmgGrassy}`);
                }
            }
        }
    } catch (e) {
        console.error('Execution Error (Terrain):', e);
    }
}

runVerification();

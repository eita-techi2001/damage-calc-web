
import { calculateDamageForConfig } from '../src/lib/logic';
import { UserPokemonConfig, GlobalFieldState } from '../src/types';

// Mock Configs
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
    console.log('=== Verifying Field Priority (Manual > User Ability) ===\n');

    // 1. Manual 'None' -> Should be Electric (Hadron Engine)
    const fieldNone: GlobalFieldState = {
        weather: 'None',
        terrain: 'None',
        userSide: { isReflect: false, isLightScreen: false, isFriendGuard: false, isHelpingHand: false },
        opponentSide: { isReflect: false, isLightScreen: false, isFriendGuard: false },
        global: { isSwordOfRuin: false, isBeadsOfRuin: false, isTabletsOfRuin: false, isVesselOfRuin: false }
    };

    try {
        const resElectric = await calculateDamageForConfig(miraidonConfig, fieldNone);
        if (!resElectric || resElectric.length === 0) throw new Error('No results for Electric');
        const dmgElectric = resElectric[0]['_meta'].maxDmg;
        console.log(`[Miraidon] Manual 'None' (Hadron Engine): ${dmgElectric}`);

        // 2. Manual 'Grassy' -> Should be Grassy (Override) -> LOWER DAMAGE
        const fieldGrassy: GlobalFieldState = { ...fieldNone, terrain: 'Grassy' };
        const resGrassy = await calculateDamageForConfig(miraidonConfig, fieldGrassy);
        if (!resGrassy || resGrassy.length === 0) throw new Error('No results for Grassy');
        const dmgGrassy = resGrassy[0]['_meta'].maxDmg;
        console.log(`[Miraidon] Manual 'Grassy': ${dmgGrassy}`);

        if (dmgElectric > dmgGrassy) {
            console.log('✅ PASS: Electric > Grassy. Manual Override respected (User Ability did NOT overwrite Manual).');
        } else {
            console.error('❌ FAIL: Electric <= Grassy. Logic might be overwriting Manual with User Ability.');
        }

    } catch (e) {
        console.error('Execution Error:', e);
    }
}

runVerification();

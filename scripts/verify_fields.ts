
import { calculateDamageForConfig } from '../src/lib/logic';
import { UserPokemonConfig, GlobalFieldState } from '../src/types';

// Mock Config: Flutter Mane vs Physical Attacker (for Reflect/Def) and vs Special Sponge (for HH)
const mockUser: UserPokemonConfig = {
    species: 'Flutter Mane',
    nature: 'Timid',
    ability: 'Protosynthesis',
    item: '',
    evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
    moves: ['Moonblast', 'Shadow Ball'],
    teraType: 'Fairy'
};

const emptyField: GlobalFieldState = {
    userSide: { isReflect: false, isLightScreen: false, isFriendGuard: false, isHelpingHand: false },
    opponentSide: { isReflect: false, isLightScreen: false, isFriendGuard: false },
    global: { isSwordOfRuin: false, isBeadsOfRuin: false, isTabletsOfRuin: false, isVesselOfRuin: false }
};

async function runTest() {
    console.log('--- Starting Field Verification ---');

    console.log('\n[Test 1] Helping Hand (Ally Side) -> Attack Tab');
    // Base Calculation
    const resBase = await calculateDamageForConfig(mockUser, emptyField);

    // Find Incineroar (Standard Target) - Check via context if possible
    const findRes = (res: any, moveName: string) => {
        return res.attack.find((r: any) =>
            r['_meta'].species === 'Incineroar' &&
            (r['_meta'].context?.move === moveName || r['技'] === 'ムーンフォース') // Fallback to JP name if context missing
        );
    };

    const baseRow = findRes(resBase, 'Moonblast');
    const baseDmg = baseRow ? baseRow['_meta'].minDmg : 0;

    // With Helping Hand
    const fieldHH = JSON.parse(JSON.stringify(emptyField));
    fieldHH.userSide.isHelpingHand = true;
    const resHH = await calculateDamageForConfig(mockUser, fieldHH);
    const hhRow = findRes(resHH, 'Moonblast');
    const hhDmg = hhRow ? hhRow['_meta'].minDmg : 0;

    console.log(`Base: ${baseDmg}, HH: ${hhDmg}`);
    if (hhDmg > baseDmg * 1.4) console.log('PASS: HH Boosted damage.');
    else console.error('FAIL: HH did not boost significantly.');


    console.log('\n[Test 2] Reflect (Ally Side) -> Defense Tab');
    // Base Defense
    const resDefBase = await calculateDamageForConfig(mockUser, emptyField);
    // Find Incineroar using Flare Blitz (Physical)
    const getPhysDmg = (res: any) => {
        // Search in defense.physical
        // Look for any Incineroar physical move
        const row = res.defense.physical.find((r: any) => r['_meta'].species === 'Incineroar'); // Incin usually uses Flare Blitz
        return row ? row['_meta'].maxDmg : 0;
    };
    const defBaseDmg = getPhysDmg(resDefBase);

    // With Reflect
    const fieldReflect = JSON.parse(JSON.stringify(emptyField));
    fieldReflect.userSide.isReflect = true;
    const resReflect = await calculateDamageForConfig(mockUser, fieldReflect);
    const defReflectDmg = getPhysDmg(resReflect);

    console.log(`Base Def: ${defBaseDmg}, Reflect Def: ${defReflectDmg}`);
    if (defBaseDmg > 0 && defReflectDmg < defBaseDmg * 0.75) console.log('PASS: Reflect reduced damage.');
    else console.error('FAIL: Reflect did not reduce significantly (or damage was 0).');
}

runTest().catch(console.error);

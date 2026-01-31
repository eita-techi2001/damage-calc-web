
// Manual Calculation Script
// Implements Standard Gen 9 Damage Formula
// Reference: https://bulbapedia.bulbagarden.net/wiki/Damage#Generation_IX

const pokeRound = (num) => {
    return (num % 1 > 0.5) ? Math.ceil(num) : Math.floor(num);
}
// Actually Pokemon usually floors at every step.
const floor = Math.floor;

function calculateDamageManual() {
    console.log("--- Manual Calculation Start ---");

    // Inputs
    const Level = 50;
    const AtkBase = 205;
    const DefBase = 130;
    const BP = 100; // Collision Course

    console.log(`Inputs: Lvl ${Level}, Atk ${AtkBase}, Def ${DefBase}, BP ${BP}`);

    // 1. Effective Attack
    // Stage -1 (Intimidate)
    // 2/3 multiplier
    let A = floor(AtkBase * 2 / 3);
    console.log(`Atk after Stage -1 (2/3): ${A}`);

    // Multiplier: Orichalcum Pulse (1.333...) = 5461/4096
    const orichalcumMult = 5461 / 4096;
    let oldA = A;
    // Standard approach: pokeRound(A * 5461 / 4096)
    A = floor(A * 5461 / 4096);
    // Wait, Smogon calc usually rounds half down (0.5->0)? Or standard round?
    // Actually most mechanics chain modifiers with floor.
    console.log(`Atk after Orichalcum (${orichalcumMult.toFixed(3)}): ${A} (prev: ${oldA})`);

    // 2. Base Damage
    // Formula: floor(floor(floor(2 * L / 5 + 2) * BP * A / D) / 50) + 2
    let term1 = floor(2 * Level / 5 + 2); // 22
    let term2 = floor(term1 * BP * A / DefBase);
    let baseDmg = floor(term2 / 50) + 2;
    console.log(`Base Damage Term: ${baseDmg}`);

    // 3. Modifiers
    // STAB: 1.5 (Koraidon is Fighting/Dragon, Move is Fighting)
    // Actually Koraidon is Fighting/Dragon.
    // Collision Course is Fighting.
    // Orichalcum Pulse Sun = Not Fire Move, so no Sun Boost directly.
    // STAB 1.5. Ascribes to floor(Dmg * 1.5) typically? Or 6144/4096?
    // Gen 5+ usually 6144/4096.
    let d = baseDmg;

    // Collision Course Effect: "Boosts power by 30% if supereffective". 
    // Some sources say ~1.3333 (5461/4096).
    // Let's assume 1.3333 for consistency with Smogon lib if it uses it. Or 1.3?
    // User says "Showdown Formula".
    // Showdown source: 'collisioncourse': { onBasePower... chainModify([5461, 4096]) } -> 1.333.
    // But this modifies BASE POWER, not Damage?
    // If Base Power is modified:
    // BP = 100 * 5461/4096 = 133.32 -> 133.
    // Let's recalculate with BP 133.

    // Recalculate with BP modified
    const bpMod = floor(BP * 5461 / 4096);
    console.log(`Modified BP (Collision Course): ${bpMod}`);

    // Re-run Base Calc
    term2 = floor(term1 * bpMod * A / DefBase);
    baseDmg = floor(term2 / 50) + 2;
    console.log(`Base Damage (Mod BP): ${baseDmg}`);
    d = baseDmg;

    // Weather: Sun (No effect on Fighting)

    // Critical: No

    // Random: 0.85 to 1.00 (16 values)

    // STAB: 1.5
    d = floor(d * 1.5); // Or 6144/4096
    console.log(`After STAB (1.5): ${d}`);

    // Type Effectiveness: 2.0 (Super Effective)
    d = floor(d * 2);
    console.log(`After Type (2.0): ${d}`);

    // Burn: No

    // Final Results (Min/Max)
    const maxDmg = d;
    const minDmg = floor(d * 0.85);

    console.log(`Manual Result: ${minDmg} - ${maxDmg}`);

    // What if Collision Course applies to DAMAGE?
    // If BP = 100. Base Dmg = 63 (calculated before).
    // STAB(1.5) = 94.
    // Type(2.0) = 188.
    // CC Boost(1.33) = 250.
    // Min 0.85 = 212.
    // Matches BP mod result approximately.

    // Let's compare with 224 (Library).
    // 224 is ~1.05x higher.
}

calculateDamageManual();

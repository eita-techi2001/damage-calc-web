"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineExplorer = void 0;
var calculator_1 = require("./calculator");
var LineExplorer = /** @class */ (function () {
    function LineExplorer() {
        this.calc = new calculator_1.DamageCalculator();
    }
    // -------------------------------------------------------------------------
    // Offense: Find Min Atk/SpA EV to OHKO/2HKO
    // -------------------------------------------------------------------------
    LineExplorer.prototype.findOffensiveLine = function (user, target, move, threshold, isUserTera, isTargetTera, fieldArgs) {
        var _a;
        if (threshold === void 0) { threshold = 'OHKO'; }
        if (isUserTera === void 0) { isUserTera = false; }
        if (isTargetTera === void 0) { isTargetTera = false; }
        if (fieldArgs === void 0) { fieldArgs = {}; }
        // Determine stat to optimize based on Move Category or User config
        var dummyRes = this.calc.calculateDamage(user, target, move, isUserTera, isTargetTera, fieldArgs);
        var category = dummyRes.move.category;
        var statKey;
        if (category === 'Physical')
            statKey = 'atk';
        else if (category === 'Special')
            statKey = 'spa';
        else
            return { success: false, evs: {}, description: 'Status Move' };
        // Binary Search for Min EV (0..252, step 4) -> 0..63
        var low = 0;
        var high = 63;
        var minEv = -1;
        while (low <= high) {
            var mid = Math.floor((low + high) / 2);
            var ev = mid * 4;
            // Clone User config with test EV
            var testUser = JSON.parse(JSON.stringify(user));
            testUser.evs[statKey] = ev; // Override EV
            var res = this.calc.calculateDamage(testUser, target, move, isUserTera, isTargetTera, fieldArgs);
            var range = res.range();
            var minDamage = range[0];
            var targetHP = res.defender.stats.hp; // Actual HP stat
            var metCondition = false;
            if (threshold === 'OHKO') {
                if (minDamage >= targetHP)
                    metCondition = true;
            }
            else if (threshold === '2HKO') {
                if (minDamage * 2 >= targetHP)
                    metCondition = true;
            }
            if (metCondition) {
                minEv = ev;
                high = mid - 1; // Try lower
            }
            else {
                low = mid + 1; // Need more power
            }
        }
        if (minEv !== -1) {
            // Get final stat
            var finalUser = JSON.parse(JSON.stringify(user));
            finalUser.evs[statKey] = minEv;
            var res = this.calc.calculateDamage(finalUser, target, move, isUserTera, isTargetTera, fieldArgs);
            return {
                success: true,
                evs: (_a = {}, _a[statKey] = minEv, _a),
                stat: res.attacker.stats[statKey],
                description: "Min ".concat(statKey.toUpperCase(), " EV: ").concat(minEv)
            };
        }
        return { success: false, evs: {}, description: 'Cannot achieve threshold with 252 EV' };
    };
    // -------------------------------------------------------------------------
    // Defense: Find Min HP+Def/SpD for Next Threshold
    // -------------------------------------------------------------------------
    LineExplorer.prototype.findDefensiveLine = function (target, user, move, category, isTargetTera, isUserTera, fieldArgs) {
        var _this = this;
        if (isTargetTera === void 0) { isTargetTera = false; }
        if (isUserTera === void 0) { isUserTera = false; }
        if (fieldArgs === void 0) { fieldArgs = {}; }
        var defKey = category === 'Physical' ? 'def' : 'spd';
        // Helper to run search with specific nature
        var runSearch = function (natureOverride) {
            var _a, _b;
            // Apply nature override
            var currentNature = natureOverride || user.nature;
            // 1. Check Base State (0 HP / 0 Def)
            var baseUser = JSON.parse(JSON.stringify(user));
            if (natureOverride)
                baseUser.nature = natureOverride;
            baseUser.evs.hp = 0;
            baseUser.evs[defKey] = 0;
            var baseRes = _this.calc.calculateReceivedDamage(target, baseUser, move, isTargetTera, isUserTera, fieldArgs);
            var baseMaxDmg = baseRes.range()[1];
            var baseHP = baseRes.defender.stats.hp;
            // Calculate current survivable hits (floored)
            var currentSurvivable = Math.floor(baseHP / baseMaxDmg);
            if (currentSurvivable >= 4) {
                return { success: false, evs: {}, description: 'Already highly durable', thresholdDesc: '高耐久' };
            }
            var targetSurvivable = currentSurvivable + 1;
            var targetDesc = '';
            if (targetSurvivable === 1)
                targetDesc = '確定耐え'; // OHKO -> Survive 1 (2HKO)
            else
                targetDesc = "\u78BA\u5B9A".concat(targetSurvivable + 1, "\u767A"); // Survive 1 -> 2 hits (3HKO), etc.
            // Search for EVs to meet: MaxDmg * targetSurvivable < HP
            var validResults = [];
            var minTotal = 9999;
            for (var h = 0; h <= 63; h++) {
                var hpEv = h * 4;
                // Binary search Def EV
                var low = 0;
                var high = 63;
                var neededDefEv = -1;
                var achievedStat = 0;
                while (low <= high) {
                    var mid = Math.floor((low + high) / 2);
                    var defEv = mid * 4;
                    var testUser = JSON.parse(JSON.stringify(user));
                    if (natureOverride)
                        testUser.nature = natureOverride;
                    testUser.evs.hp = hpEv;
                    testUser.evs[defKey] = defEv;
                    var res = _this.calc.calculateReceivedDamage(target, testUser, move, isTargetTera, isUserTera, fieldArgs);
                    var maxDamage = res.range()[1]; // Max roll
                    var userHP = res.defender.stats.hp;
                    var userDefStat = res.defender.stats[defKey];
                    if (maxDamage * targetSurvivable < userHP) {
                        neededDefEv = defEv;
                        achievedStat = userDefStat;
                        high = mid - 1; // Try lower def
                    }
                    else {
                        low = mid + 1;
                    }
                }
                if (neededDefEv !== -1) {
                    var total = hpEv + neededDefEv;
                    validResults.push({ hp: hpEv, def: neededDefEv, total: total, stat: achievedStat });
                    if (total < minTotal) {
                        minTotal = total;
                    }
                }
            }
            if (validResults.length > 0) {
                // Heuristic: "H-Main with B-flexibility"
                // 1. Find the Absolute Most Efficient result (Global Min Total)
                validResults.sort(function (a, b) {
                    if (a.total !== b.total)
                        return a.total - b.total;
                    return b.hp - a.hp; // Tiebreak: Prefer HP
                });
                var efficientResult = validResults[0];
                // 2. Select Recommended Result
                // Strategy: 
                // - Ideally keep Def/SpD investment low (<= 20) to maximize H.
                // - If we can achieve decent efficiency within Def <= 20, choose the MOST efficient one in that range.
                // - If no solution exists with Def <= 20, fallback to Maximize HP (Minimize Def).
                var defLimit_1 = 20;
                var hFocusedCandidates = validResults.filter(function (r) { return r.def <= defLimit_1; });
                var bestResult = void 0;
                if (hFocusedCandidates.length > 0) {
                    // Priority 1: Within Def <= 20, pick the one with lowest Total EV (Best Efficiency in range).
                    // This allows "saving EVs" by investing small Def (e.g. H244 B4 vs H252 B0).
                    hFocusedCandidates.sort(function (a, b) {
                        if (a.total !== b.total)
                            return a.total - b.total;
                        return b.hp - a.hp;
                    });
                    bestResult = hFocusedCandidates[0];
                }
                else {
                    // Priority 2: Fallback (Need more than 20 Def).
                    // Just Maximize HP (Minimize Def).
                    validResults.sort(function (a, b) { return b.hp - a.hp; });
                    bestResult = validResults[0];
                }
                return {
                    success: true,
                    evs: (_a = { hp: bestResult.hp }, _a[defKey] = bestResult.def, _a),
                    stat: bestResult.stat,
                    nature: currentNature,
                    totalEvCost: bestResult.total,
                    description: "Min EVs (HP-Biased): H".concat(bestResult.hp, " / ").concat(defKey === 'def' ? 'B' : 'D').concat(bestResult.def, " (Total: ").concat(bestResult.total, ")"),
                    thresholdDesc: targetDesc,
                    // Efficient Data
                    efficientEvs: (_b = { hp: efficientResult.hp }, _b[defKey] = efficientResult.def, _b),
                    efficientTotal: efficientResult.total,
                    efficientStat: efficientResult.stat
                };
            }
            return null;
        };
        // Pass 1: Original Nature (Neutral Def usually)
        var res1 = runSearch();
        if (res1 && res1.success)
            return res1;
        // Pass 2: Positive Nature (Bold / Calm)
        var positiveNature = category === 'Physical' ? 'Bold' : 'Calm';
        var res2 = runSearch(positiveNature);
        if (res2 && res2.success)
            return res2;
        return { success: false, evs: {}, description: 'Cannot reach next threshold', thresholdDesc: '解なし' };
    };
    return LineExplorer;
}());
exports.LineExplorer = LineExplorer;

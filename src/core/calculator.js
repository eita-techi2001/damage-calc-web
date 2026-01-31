"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DamageCalculator = void 0;
var calc_1 = require("@smogon/calc");
var gen = calc_1.Generations.get(9);
var field = new calc_1.Field({ gameType: 'Doubles' });
var DamageCalculator = /** @class */ (function () {
    function DamageCalculator() {
    }
    // Convert User/Meta config to @smogon/calc Pokemon object
    DamageCalculator.prototype.toCalcPokemon = function (config, isDynamax, isTera) {
        if (isDynamax === void 0) { isDynamax = false; }
        if (isTera === void 0) { isTera = false; }
        var options = {
            item: config.item,
            nature: config.nature,
            ability: config.ability,
            evs: config.evs,
            ivs: config.ivs,
            level: 50,
            // teraType: config.teraType  <-- Don't pass this by default
        };
        // Initialize overrides from config
        options.overrides = __assign({}, config.overrides);
        if (isTera && config.teraType) {
            // Do NOT override types manually errors in loss of original STAB (Adaptability check)
            // options.overrides = { ...options.overrides, types: [config.teraType] }; 
            options.teraType = config.teraType;
        }
        return new calc_1.Pokemon(gen, config.species, options);
    };
    DamageCalculator.prototype.calculateDamage = function (attackerConfig, defenderConfig, moveName, isAttackerTera, isDefenderTera, fieldOptions) {
        if (isAttackerTera === void 0) { isAttackerTera = false; }
        if (isDefenderTera === void 0) { isDefenderTera = false; }
        if (fieldOptions === void 0) { fieldOptions = {}; }
        var attacker = this.toCalcPokemon(attackerConfig, false, isAttackerTera);
        var defender = this.toCalcPokemon(defenderConfig, false, isDefenderTera);
        // Create Move
        var move = new calc_1.Move(gen, moveName);
        // Merge default field (Doubles) with overrides
        var currentField = new calc_1.Field(__assign({ gameType: 'Doubles' }, fieldOptions));
        // Calculate
        var result = (0, calc_1.calculate)(gen, attacker, defender, move, currentField);
        return result;
    };
    // Add more methods for scenarios (e.g., getting hit by meta)
    DamageCalculator.prototype.calculateReceivedDamage = function (attackerConfig, defenderConfig, moveName, isAttackerTera, isDefenderTera, fieldOptions) {
        if (isAttackerTera === void 0) { isAttackerTera = false; }
        if (isDefenderTera === void 0) { isDefenderTera = false; }
        if (fieldOptions === void 0) { fieldOptions = {}; }
        var attacker = this.toCalcPokemon(attackerConfig, false, isAttackerTera);
        var defender = this.toCalcPokemon(defenderConfig, false, isDefenderTera);
        var move = new calc_1.Move(gen, moveName);
        var currentField = new calc_1.Field(__assign({ gameType: 'Doubles' }, fieldOptions));
        return (0, calc_1.calculate)(gen, attacker, defender, move, currentField);
    };
    return DamageCalculator;
}());
exports.DamageCalculator = DamageCalculator;

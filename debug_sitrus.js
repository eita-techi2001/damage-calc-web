"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const calc_1 = require("@smogon/calc");
const gen = calc_1.Generations.get(8);
// Garchomp vs Rotom-Wash (Sitrus Berry)
const attacker = new calc_1.Pokemon(gen, 'Garchomp', {
    item: 'Choice Band',
    nature: 'Adamant',
    evs: { atk: 252 }
});
const defender = new calc_1.Pokemon(gen, 'Rotom-Wash', {
    item: 'Sitrus Berry',
    nature: 'Bold',
    evs: { hp: 252, def: 252 }
});
const move = new calc_1.Move(gen, 'Dragon Claw');
const moveStrong = new calc_1.Move(gen, 'Outrage');
const result = (0, calc_1.calculate)(gen, attacker, defender, move);
const resultStrong = (0, calc_1.calculate)(gen, attacker, defender, moveStrong);
const fs = __importStar(require("fs"));
// Check Leftovers for comparison
const defenderLeftovers = new calc_1.Pokemon(gen, 'Rotom-Wash', {
    item: 'Leftovers',
    nature: 'Bold',
    evs: { hp: 252, def: 252 }
});
const resultLeftovers = (0, calc_1.calculate)(gen, attacker, defenderLeftovers, move);
const output = {
    sitrusDragonClaw: {
        attacker: attacker.name,
        defender: defender.name,
        hp: defender.stats.hp,
        damageRange: result.range(),
        koText: result.kochance().text,
        koChance: result.kochance().chance,
    },
    sitrusOutrage: {
        damageRange: resultStrong.range(),
        koText: resultStrong.kochance().text,
    },
    leftovers: {
        koText: resultLeftovers.kochance().text,
    }
};
fs.writeFileSync('debug_output.json', JSON.stringify(output, null, 2));
console.log('Done writing debug_output.json');

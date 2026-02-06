
const fs = require('fs');
const https = require('https');
const { Generations } = require('@smogon/calc');

const gen = Generations.get(9);

const urls = {
    en: 'https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/en.json',
    ja: 'https://raw.githubusercontent.com/sindresorhus/pokemon/main/data/ja.json'
};

const fetchJson = (url) => new Promise((resolve, reject) => {
    https.get(url, (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => resolve(JSON.parse(data)));
        res.on('error', reject);
    });
});

const suffixMap = [
    // Calyrex
    { k: 'Ice', ja: '(はくば)' },
    { k: 'Shadow', ja: '(こくば)' },
    // Urshifu
    { k: 'Rapid-Strike', ja: '(れんげき)' },
    { k: 'Single-Strike', ja: '(いちげき)' },
    // Ogerpon
    { k: 'Hearthflame', ja: '(かまど)' },
    { k: 'Wellspring', ja: '(いど)' },
    { k: 'Cornerstone', ja: '(いしずえ)' },
    { k: 'Teal', ja: '(みどり)' },
    // Terapagos
    { k: 'Terastal', ja: '(テラス)' },
    { k: 'Stellar', ja: '(ステラ)' },
    // Ursaluna
    { k: 'Bloodmoon', ja: '(アカツキ)' },
    // Kami (Landorus etc)
    { k: 'Therian', ja: '(霊獣)' },
    { k: 'Incarnate', ja: '(化身)' },
    // Regional
    { k: 'Alola', ja: '(アローラ)' },
    { k: 'Galar', ja: '(ガラル)' },
    { k: 'Hisui', ja: '(ヒスイ)' },
    { k: 'Paldea', ja: '(パルデア)' },
    // Rotom
    { k: 'Wash', ja: '(ウォッシュ)' },
    { k: 'Heat', ja: '(ヒート)' },
    { k: 'Mow', ja: '(カット)' },
    { k: 'Fan', ja: '(スピン)' },
    { k: 'Frost', ja: '(フロスト)' },
    // Necrozma
    { k: 'Dusk-Mane', ja: '(たそがれ)' },
    { k: 'Dawn-Wings', ja: '(あかつき)' },
    { k: 'Ultra', ja: '(ウルトラ)' },
    // Kyurem
    { k: 'Black', ja: '(ブラック)' },
    { k: 'White', ja: '(ホワイト)' },
    // Zacian/Zama
    { k: 'Crowned', ja: '(王)' },
    // Paldea Tauros
    { k: 'Combat', ja: '(コンバット)' },
    { k: 'Blaze', ja: '(ブレイズ)' },
    { k: 'Aqua', ja: '(ウォーター)' },
    // Deoxys
    { k: 'Attack', ja: '(アタック)' },
    { k: 'Defense', ja: '(ディフェンス)' },
    { k: 'Speed', ja: '(スピード)' },
    // Origin Forms (Giratina, Dialga, Palkia)
    { k: 'Origin', ja: '(オリジン)' },
    // Shaymin
    { k: 'Sky', ja: '(スカイ)' },
    // Keldeo
    { k: 'Resolute', ja: '(かくご)' },
    // Meloetta
    { k: 'Pirouette', ja: '(ステップ)' },
    // Greninja
    { k: 'Ash', ja: '(サトシ)' },
    // Aegislash
    { k: 'Blade', ja: '(ブレード)' },
    { k: 'Shield', ja: '(シールド)' },
    // Pumpkaboo/Gourgeist
    { k: 'Small', ja: '(ちいさい)' },
    { k: 'Large', ja: '(おおきい)' },
    { k: 'Super', ja: '(とくだい)' },
    // Zygarde
    { k: 'Complete', ja: '(パーフェクト)' },
    { k: '10%', ja: '(10%)' },
    // Wishiwashi
    { k: 'School', ja: '(むれた)' },
    // Minior
    { k: 'Meteor', ja: '(りゅうせい)' },
    { k: 'Core', ja: '(コア)' },
    // Lycanroc
    { k: 'Dusk', ja: '(たそがれ)' },
    { k: 'Midnight', ja: '(まよなか)' },
    { k: 'Midday', ja: '(まひる)' },
    // Toxtricity
    { k: 'Low-Key', ja: '(ロー)' }, // Low Key
    { k: 'Amped', ja: '(ハイ)' }, // Amped (Base usually)
    // Eiscue
    { k: 'Ice', ja: '(アイス)' },
    { k: 'Noice', ja: '(ナイス)' },
    // Palafin
    { k: 'Hero', ja: '(マイティ)' },
    // Tatsugiri
    { k: 'Droopy', ja: '(たれた)' },
    { k: 'Stretchy', ja: '(のびた)' },
    { k: 'Curly', ja: '(そった)' },
    // Dudunsparce
    { k: 'Three-Segment', ja: '(みつふし)' },
    // Maushold
    { k: 'Four', ja: '(４ひき)' },
    { k: 'Three', ja: '(３びき)' },
    // Squawkabilly
    { k: 'Yellow', ja: '(イエロー)' },
    { k: 'White', ja: '(ホワイト)' },
    { k: 'Blue', ja: '(ブルー)' },
    { k: 'Green', ja: '(グリーン)' },
    // Poltchageist / Sinistcha
    { k: 'Artisan', ja: '(たくみ)' },
    { k: 'Masterpiece', ja: '(けっさく)' },
    // Burmy/Wormadam
    { k: 'Sandy', ja: '(すなち)' },
    { k: 'Trash', ja: '(ゴミ)' },
    { k: 'Plant', ja: '(くさき)' },
    // Castform
    { k: 'Sunny', ja: '(たいよう)' },
    { k: 'Rainy', ja: '(あまみず)' },
    { k: 'Snowy', ja: '(ゆきぐも)' },
    // Basculin
    { k: 'Blue-Striped', ja: '(あおすじ)' },
    { k: 'Red-Striped', ja: '(あかすじ)' },
    { k: 'White-Striped', ja: '(しろすじ)' },
    // Morpeko
    { k: 'Hangry', ja: '(はらぺこ)' },
    // Gimmighoul
    { k: 'Roaming', ja: '(とほ)' },
    { k: 'Chest', ja: '(はこ)' },
    // Darmanitan
    { k: 'Zen', ja: '(ダルマ)' },
    // Gender
    { k: 'F', ja: '(メス)' },
    // Pikachu Caps (Cosmetic but might appear)
    { k: 'Original', ja: '(オリジナル)' },
    { k: 'Hoenn', ja: '(ホウエン)' },
    { k: 'Sinnoh', ja: '(シンオウ)' },
    { k: 'Unova', ja: '(イッシュ)' },
    { k: 'Kalos', ja: '(カロス)' },
    { k: 'Alola', ja: '(アローラ)' },
    { k: 'Partner', ja: '(キミにきめた)' },
    { k: 'World', ja: '(ワールド)' },
    // Misc
    { k: 'Complete', ja: '(かんぜん)' }, // Zygarde duplicate
    { k: 'Totem', ja: '(ぬし)' },
];

// Manual overrides for tricky ones
const manualMap = {
    'Ursaluna-Bloodmoon': 'ガチグマ(アカツキ)',
    'Castform-Sunny': 'ポワルン(たいよう)',
    'Castform-Rainy': 'ポワルン(あまみず)',
    'Castform-Snowy': 'ポワルン(ゆきぐも)',
    // Add more if needed
};

(async () => {
    console.log('Fetching base data...');
    const [enList, jaList] = await Promise.all([fetchJson(urls.en), fetchJson(urls.ja)]);

    // Create Base Map: English -> Japanese AND ID Map
    const baseMap = {};
    const idMap = {};
    enList.forEach((name, i) => {
        const lower = name.toLowerCase();
        baseMap[lower] = jaList[i];
        idMap[lower] = i + 1; // Pokedex Number
    });

    console.log('Generating full list from Smogon Gen 9 species...');
    const fullList = [];
    const usedIds = new Set();
    const capBlocklist = new Set([
        'Syclar', 'Sydren', 'Smokomodo', 'Snaelstrom', 'Saharaja', 'Tactite', 'Tomohawk',
        'Voodoom', 'Venomicon', 'Volkraken', 'Plasmanta', 'Pajantom', 'Pyroak',
        'Naviathan', 'Necturna', 'Mollux', 'Malaconda', 'Miasmaw', 'Kitsunoh',
        'Kerfluffle', 'Justyke', 'Jumbao', 'Hemogoblin', 'Fidgit', 'Equilibra',
        'Cyclohm', 'Crucibelle', 'Cresceidon', 'Colossoil', 'Chromera', 'Cawmodore',
        'Caribolt', 'Arghonaut', 'Astrolotl', 'Aurumoth', 'Stratagem', 'Revenankh', 'Dorsoil',
        'Protowatt', 'Voodoll', 'Floatoy', 'Caimanoe', 'Plasmanta', 'Rebble', 'Breezi', 'Privatyke',
        'Swirlpool', 'Mumbao', 'Jumbao', 'Pajantom', 'Miasmaw', 'Chromera'
    ]);

    for (const species of gen.species) {
        const enName = species.name;

        // Skip if already processed (though Smogon list is unique usually)
        if (usedIds.has(enName)) continue;
        usedIds.add(enName);

        // Explicit blocklist checks
        if (capBlocklist.has(enName) || capBlocklist.has(enName.split('-')[0])) continue;


        // Filter out unwanted forms
        const isNonstandard = species.isNonstandard;
        // if (enName === 'Naviathan') {
        //      // console.log(`Naviathan isNonstandard: '${isNonstandard}'`);
        // }

        if (
            isNonstandard === 'CAP' ||
            isNonstandard === 'LGPE' ||
            isNonstandard === 'Pokestar' ||
            isNonstandard === 'Unobtainable' ||
            species.tier?.startsWith('CAP') ||
            species.name.includes('-Mega') ||
            species.name.includes('-Gmax') ||
            species.name.includes('-Primal') ||
            species.name.includes('-Eternamax')
        ) {
            // console.log(`Removed: ${enName} (Nonstd: ${isNonstandard}, Tier: ${species.tier})`);
            continue;
        }

        // 1. Try Direct Match
        // Note: sindresorhus/pokemon names might differ slightly (e.g. "Type: Null" vs "Type: Null").
        // We normalize to lowercase for lookup.
        const lowerName = enName.toLowerCase();
        let jaName = baseMap[lowerName];
        let num = idMap[lowerName];

        // 2. Try Manual Map
        if (!jaName && manualMap[enName]) {
            jaName = manualMap[enName];
        }

        // 3. Try Suffix Logic
        if (!jaName && enName.includes('-')) {
            const parts = enName.split('-');
            const baseGuess = parts[0];
            const baseGuessLower = baseGuess.toLowerCase();
            // Case for "Iron Bundle" etc (Paradox) - already handled by direct match usually,
            // but if not, they are distinct species, effectively base.

            let baseJa = baseMap[baseGuessLower];
            // Try replacing hyphen with space for base lookup (e.g. Tapu-Koko -> "tapu koko")
            if (!baseJa) baseJa = baseMap[enName.replace(/-/g, ' ').toLowerCase()];

            // Try to recover Num from base if missing
            if (!num) num = idMap[baseGuessLower] || idMap[enName.replace(/-/g, ' ').toLowerCase()];

            // Special handling for "Ogerpon", "Urshifu", "Terapagos" where base is one of the forms
            if (enName.startsWith('Ogerpon')) { baseJa = 'オーガポン'; num = num || idMap['ogerpon']; }
            if (enName.startsWith('Urshifu')) { baseJa = 'ウーラオス'; num = num || idMap['urshifu']; }
            if (enName.startsWith('Terapagos')) { baseJa = 'テラパゴス'; num = num || idMap['terapagos']; }
            if (enName.startsWith('Gourgeist')) baseJa = 'パンプジン';
            if (enName.startsWith('Pumpkaboo')) baseJa = 'バケッチャ';
            if (enName.startsWith('Toxtricity')) baseJa = 'ストリンダー';
            if (enName.startsWith('Basculin')) baseJa = 'バスラオ';
            if (enName.startsWith('Lycanroc')) baseJa = 'ルガルガン';
            if (enName.startsWith('Wormadam')) baseJa = 'ミノマダム';
            if (enName.startsWith('Arceus')) baseJa = 'アルセウス';
            if (enName.startsWith('Silvally')) baseJa = 'シルヴァディ';
            if (enName.startsWith('Genesect')) baseJa = 'ゲノセクト';
            if (enName.startsWith('Vivillon')) baseJa = 'ビビヨン';
            if (enName.startsWith('Minior')) baseJa = 'メテノ';
            if (enName.startsWith('Zygarde')) baseJa = 'ジガルデ';
            if (enName.startsWith('Morpeko')) baseJa = 'モルペコ';
            if (enName.startsWith('Eiscue')) baseJa = 'コオリッポ';
            if (enName.startsWith('Tatsugiri')) baseJa = 'シャリタツ';
            if (enName.startsWith('Squawkabilly')) baseJa = 'イキリンコ';
            if (enName.startsWith('Maushold')) baseJa = 'イッカネズミ';
            if (enName.startsWith('Dudunsparce')) baseJa = 'ノココッチ';
            if (enName.startsWith('Gimmighoul')) baseJa = 'コレクレー';
            if (enName.startsWith('Poltchageist')) baseJa = 'チャデス';
            if (enName.startsWith('Sinistcha')) baseJa = 'ヤバソチャ';
            if (enName.startsWith('Iron Leaves')) baseJa = 'テツノイサハ';
            if (enName.startsWith('Walking Wake')) baseJa = 'ウネルミナモ';
            if (enName.startsWith('Raging Bolt')) baseJa = 'タケルライコ';
            if (enName.startsWith('Gouging Fire')) baseJa = 'グレンアルマ';
            if (enName.startsWith('Iron Crown')) baseJa = 'テツノカシラ';
            if (enName.startsWith('Iron Boulder')) baseJa = 'テツノイワオ';
            if (enName.startsWith('Iron Thorns')) baseJa = 'テツノイバラ';
            if (enName.startsWith('Iron Moth')) baseJa = 'テツノドクガ';
            if (enName.startsWith('Iron Bundle')) baseJa = 'テツノツツミ';
            if (enName.startsWith('Iron Hands')) baseJa = 'テツノカイナ';
            if (enName.startsWith('Iron Jugulis')) baseJa = 'テツノコウベ';
            if (enName.startsWith('Iron Treads')) baseJa = 'テツノワダチ';
            if (enName.startsWith('Iron Valiant')) baseJa = 'テツノブジン';
            if (enName.startsWith('Scream Tail')) baseJa = 'サケブシッポ';
            if (enName.startsWith('Brute Bonnet')) baseJa = 'アラブルタケ';
            if (enName.startsWith('Flutter Mane')) baseJa = 'ハバタクカミ';
            if (enName.startsWith('Slither Wing')) baseJa = 'チヲハウハネ';
            if (enName.startsWith('Sandy Shocks')) baseJa = 'スナノケガワ';
            if (enName.startsWith('Great Tusk')) baseJa = 'イダイナキバ';
            if (enName.startsWith('Roaring Moon')) baseJa = 'トドロクツキ';


            if (baseJa) {
                let suffixJa = '';
                if (enName.startsWith('Arceus-') || enName.startsWith('Silvally-')) {
                    const typeMap = {
                        'Bug': 'むし', 'Dark': 'あく', 'Dragon': 'ドラゴン', 'Electric': 'でんき',
                        'Fairy': 'フェアリー', 'Fighting': 'かくとう', 'Fire': 'ほのお', 'Flying': 'ひこう',
                        'Ghost': 'ゴースト', 'Grass': 'くさ', 'Ground': 'じめん', 'Ice': 'こおり',
                        'Poison': 'どく', 'Psychic': 'エスパー', 'Rock': 'いわ', 'Steel': 'はがね',
                        'Water': 'みず', 'Normal': 'ノーマル'
                    };
                    const suffixRaw = enName.split('-')[1]; // Arceus-Bug -> Bug
                    if (typeMap[suffixRaw]) {
                        suffixJa = `(${typeMap[suffixRaw]})`;
                    }
                } else if (enName.startsWith('Genesect-')) {
                    const driveMap = {
                        'Burn': 'ブレイズカセット',
                        'Chill': 'フリーズカセット',
                        'Douse': 'アクアカセット',
                        'Shock': 'イナズマカセット'
                    };
                    const suffixRaw = enName.split('-')[1];
                    if (driveMap[suffixRaw]) {
                        suffixJa = `(${driveMap[suffixRaw]})`;
                    }
                } else {
                    // Iterate all suffixes to match
                    // Priority: Longer matches first?
                    for (const s of suffixMap) {
                        if (enName.includes(s.k)) { // simplified check
                            // Check if specific part matches to avoid partial matches?
                            // e.g. "Low Key"
                            if (enName.includes(`-${s.k}`) || enName.endsWith(s.k)) {
                                suffixJa += s.ja; // Accumulate suffixes
                                // break; // REMOVED to allow multiple suffixes
                            }
                        }
                    }
                }

                if (suffixJa) {
                    jaName = `${baseJa}${suffixJa}`;
                } else {
                    // If base is found but suffix not found, defaulting to baseJa might be dangerous if form is significant.
                    // But for "Basculin-Red-Striped", if "Basculin" is "バスラオ", then "Basculin-Red-Striped" -> "バスラオ" is OKish?
                    // Better to leave untranslated if unknown suffix, or map?
                }
            }
        }

        // Special Case: Paradox (Iron *, Scream Tail)
        // These should be in baseMap (IDs 900+).
        // If "Iron Valiant" isn't found, maybe "Iron-Valiant"?
        if (!jaName) {
            // Try removing spaces or adding hyphens?
            // Sindresorhus: "Iron Valiant"
            // Smogon: "Iron Valiant"
            // Should match.
            // Verify normalization: "Iron Valiant".toLowerCase() -> "iron valiant".
        }

        // 4. Fallback
        if (!jaName) {
            // console.warn(`Missing translation for: ${enName}`);
            // Keep English or explicitly mark?
            // Use English as fallback
            jaName = enName;
        }

        fullList.push({
            name: {
                english: enName,
                japanese: jaName
            },
            num: num || 99999 // Capture Num or fallback
        });
    }

    // Sort by Num, then Name
    fullList.sort((a, b) => a.num - b.num || a.name.english.localeCompare(b.name.english));

    console.log('Top 5 Sorted:', fullList.slice(0, 5).map(i => `${i.name.english} (#${i.num})`));

    // Deduplicate by Japanese Name
    const uniqueList = [];
    const seenJa = new Set();
    for (const item of fullList) {
        // Filter out junk/test mons
        if (item.num > 9000) continue;

        if (!seenJa.has(item.name.japanese)) {
            uniqueList.push({ name: item.name }); // Strip num to keep clean format
            seenJa.add(item.name.japanese);
        }
    }

    console.log(`Generated ${uniqueList.length} entries.`);
    fs.writeFileSync('src/data/pokedex_multilang.json', JSON.stringify(uniqueList, null, 2));
    console.log('Wrote to src/data/pokedex_multilang.json');
})();

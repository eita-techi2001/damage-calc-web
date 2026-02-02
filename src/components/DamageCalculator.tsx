'use client';

import { useState, useTransition, useEffect, useMemo, memo } from 'react';
import { getAllMoves, loadConfig, calculateCustom, getMetaOpponents, getAllSpecies, getPokemonData, getTranslationData } from '@/app/actions';
import { PokemonStats, UserPokemonConfig, GlobalFieldState, CalculationSettings, VariantFilterMode } from '@/types';
import { t, translateText, toEnglish } from '@/core/translator';
import { AbilityBranches } from '@/data/ability_branches';

interface DamageCalculatorProps {
    configs: string[];
    allMoves: string[]; // Added
}

// Helper: Hiragana to Katakana
const hiraganaToKatakana = (src: string) => {
    return src.replace(/[\u3041-\u3096]/g, function (match) {
        var chr = match.charCodeAt(0) + 0x60;
        return String.fromCharCode(chr);
    });
};

// Header Constants
// Header Constants
const HEADERS_ATTACK = ['相手', '技', 'DamagePct', 'DamageReal', '確定数', '相手HP', '相手防御実数', '相手特性', '自分実数値', '自分特性', '自分持ち物', '自分テラスタル', '場の状態'];
const HEADERS_DEF_PHYS = ['相手', '技', 'DamagePct', 'DamageReal', '確定数', '相手攻撃実数', '相手特性', 'HP実数', '防御実数', '自分特性', '自分持ち物', '自分テラスタル', '場の状態'];
const HEADERS_DEF_SPEC = ['相手', '技', 'DamagePct', 'DamageReal', '確定数', '相手攻撃実数', '相手特性', 'HP実数', '特防実数', '自分特性', '自分持ち物', '自分テラスタル', '場の状態'];
const HEADERS_OFF_LINE = ['必要実数値', '登録値', '自分特性', '自分テラスタル', '自分持ち物', '技', '相手', '相手特性', '相手HP', '相手耐久', 'H4', 'H252', 'HB/HD特化', '場の状態'];

const HEADERS_DEF_LINE_PHYS = ['HP実数', '防御実数', '実数値1', '結果1', '自分特性', '自分テラスタル', '自分持ち物', '相手', '技', '特化', '結果2', '無補正252', '結果3', '場の状態'];
const HEADERS_DEF_LINE_SPEC = ['HP実数', '特防実数', '実数値1', '結果1', '自分特性', '自分テラスタル', '自分持ち物', '相手', '技', '特化', '結果2', '無補正252', '結果3', '場の状態'];

const REFINED_ITEMS = [
    '',
    'Choice Band', 'Choice Specs', 'Wise Glasses', 'Muscle Band',
    'Life Orb', 'Booster Energy',
    'Sitrus Berry', 'Figy Berry',
    'Assault Vest', 'Eviolite', 'Clear Amulet', 'Expert Belt',
    // Type Enhancing
    'Charcoal', 'Mystic Water', 'Miracle Seed', 'Magnet', 'Hard Stone',
    'Sharp Beak', 'Poison Barb', 'Never-Melt Ice', 'Spell Tag',
    'Twisted Spoon', 'Soft Sand', 'Black Glasses', 'Metal Coat',
    'Silk Scarf', 'Dragon Fang', 'Black Belt', 'Fairy Feather'
];

// Helper to get Icon URL
const getIconUrl = (speciesName: string) => {
    if (!speciesName) return '';
    // PokemonDB Style: lowercase, replace spaces with hyphens, remove special chars (except hyphens)
    let slug = speciesName.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');

    // Manual overrides for PokemonDB inconsistency
    if (slug === 'calyrex-shadow') slug = 'calyrex-shadow-rider';
    if (slug === 'calyrex-ice') slug = 'calyrex-ice-rider';

    return `https://img.pokemondb.net/sprites/scarlet-violet/icon/${slug}.png`;
};

const getItemIconUrl = (itemName: string) => {
    if (!itemName || itemName === '-' || itemName === '(No Item)') return '';
    const slug = itemName.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '');
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
};

const getTypeIconUrl = (typeName: string) => {
    if (!typeName || typeName === '-' || typeName === 'Terastal') return '';
    // Use Showdown for all types including Stellar (Stellar.png exists on Showdown)
    return `https://play.pokemonshowdown.com/sprites/types/${typeName}.png`;
};

const Table = memo(function Table({ headers, rows, highlightEfficient }: { headers: string[], rows: any[], highlightEfficient?: boolean }) {
    const [displayLimit, setDisplayLimit] = useState(50);

    // Reset limit when data changes (e.g. calculation update or tab switch if rows ref changes)
    useEffect(() => {
        setDisplayLimit(50);
    }, [rows]);

    if (!rows || rows.length === 0) {
        return <div className="text-center py-8 text-gray-500">No results found.</div>;
    }

    const visibleRows = rows.slice(0, displayLimit);
    const hasMore = displayLimit < rows.length;

    const handleShowMore = () => {
        setDisplayLimit(prev => Math.min(prev + 50, rows.length));
    };

    const handleShowAll = () => {
        setDisplayLimit(rows.length);
    };

    const renderCell = (header: string, val: string, row: any) => {
        if (header.includes('持ち物')) {
            const eng = toEnglish(val);
            const url = getItemIconUrl(eng);
            if (url) return <img src={url} alt={val} className="w-6 h-6 object-contain mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
        }
        if (header.includes('テラスタル')) {
            const eng = toEnglish(val);
            const url = getTypeIconUrl(eng);
            if (url) return <img src={url} alt={val} className="w-8 h-4 object-contain mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
        }
        if (header === '相手' && row._meta?.species) {
            const oppTera = toEnglish(String(row['相手テラスタル'] || '-'));
            const oppItem = toEnglish(String(row['相手持ち物'] || '-'));
            const teraUrl = getTypeIconUrl(oppTera);
            const itemUrl = getItemIconUrl(oppItem);

            return (
                <div className="flex items-center gap-2">
                    <img
                        src={getIconUrl(row._meta.species)}
                        alt={val}
                        className="w-8 h-6 object-contain pixelated"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span>{t(row._meta.species)}</span>
                    <div className="flex items-center gap-1 ml-1 opacity-80">
                        {teraUrl && (
                            <img
                                src={teraUrl}
                                alt={oppTera}
                                className="w-8 h-4 object-contain"
                                title={`Tera: ${oppTera}`}
                                loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        )}
                        {itemUrl && (
                            <img
                                src={itemUrl}
                                alt={oppItem}
                                className="w-5 h-5 object-contain"
                                title={`Item: ${oppItem}`}
                                loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        )}
                    </div>
                </div>
            );
        }
        return translateText(String(val));
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="overflow-x-auto border border-gray-700/50 rounded-lg">
                <table className="min-w-max divide-y divide-gray-700 table-auto w-full">
                    <thead>
                        <tr>
                            {headers.map((h) => (
                                <th key={h} className="px-2 py-3 text-left text-xs font-bold text-gray-300 uppercase tracking-wider bg-gray-900/80 sticky top-0 backdrop-blur-sm whitespace-nowrap border-b border-gray-600">
                                    {translateText(h)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700 bg-transparent">
                        {visibleRows.map((row, idx) => (
                            <tr key={idx} className={`hover:bg-white/5 transition-colors ${highlightEfficient && row['最良合計'] !== '-' ? 'bg-green-900/10' : ''}`}>
                                {headers.map((h) => (
                                    <td key={h} className="px-2 py-3 text-sm text-gray-300 whitespace-nowrap border-r border-gray-700/30 last:border-r-0">
                                        <div className="flex justify-center items-center h-full">
                                            {renderCell(h, String(row[h]), row)}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {hasMore && (
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={handleShowMore}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm transition-colors"
                    >
                        Show More (Remaining: {rows.length - displayLimit})
                    </button>
                    <button
                        onClick={handleShowAll}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm transition-colors"
                    >
                        Show All
                    </button>
                </div>
            )}
        </div>
    );
});

// Reusable Autocomplete Input
const AutocompleteInput = ({ value, onChange, onSelect, itemList, placeholder, autoFocus }: {
    value: string,
    onChange: (val: string) => void,
    onSelect: (val: string) => void,
    itemList: string[],
    placeholder?: string,
    autoFocus?: boolean
}) => {
    const [show, setShow] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const LIMIT = 2000; // Increased to show all

    // Body Scroll Lock
    useEffect(() => {
        if (show) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [show]);

    useEffect(() => {
        if (!show && !value) {
            setSuggestions([]);
            return;
        }
        const lower = value.toLowerCase();
        const kata = hiraganaToKatakana(value);
        const filtered = itemList.filter(item => {
            const label = t(item);
            if (!value) return true;
            return (
                item.toLowerCase().includes(lower) ||
                label.includes(value) ||
                label.includes(kata)
            );
        }).slice(0, LIMIT);
        setSuggestions(filtered);
    }, [value, itemList, show]);

    return (
        <div className="relative w-full" style={{ zIndex: show ? 1000 : 'auto' }}>
            <input
                type="text"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setShow(true);
                }}
                onFocus={() => {
                    setShow(true);
                    if (suggestions.length === 0 && !value) setSuggestions(itemList.slice(0, LIMIT));
                }}
                onBlur={() => setTimeout(() => setShow(false), 200)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        onSelect(value);
                        setShow(false);
                        (e.target as HTMLInputElement).blur();
                    }
                }}
                placeholder={placeholder}
                autoFocus={autoFocus}
                style={{ backgroundColor: 'rgba(17, 24, 39, 1)', color: 'white' }}
                className="block w-full rounded-lg border-gray-600 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm py-3 px-4 transition-colors"
            />
            {show && (
                <>
                    <div className="fixed inset-0 z-[100] bg-transparent" onClick={() => setShow(false)} />
                    <ul
                        className="absolute z-[101] w-full mt-1 border border-gray-700 rounded-lg shadow-xl overscroll-contain"
                        style={{ backgroundColor: 'rgba(17, 24, 39, 1)', maxHeight: '350px', overflowY: 'auto' }}
                    >
                        {suggestions.length > 0 ? (
                            suggestions.map(s => (
                                <li
                                    key={s}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        onSelect(t(s));
                                        setShow(false);
                                    }}
                                    style={{ backgroundColor: 'rgba(17, 24, 39, 1)' }}
                                    className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200 border-b border-gray-800 last:border-0"
                                >
                                    {t(s)} <span className="text-xs text-gray-500">({s})</span>
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-2 text-gray-500 text-sm" style={{ backgroundColor: 'rgba(17, 24, 39, 1)' }}>No matches</li>
                        )}
                    </ul>
                </>
            )}
        </div>
    );
};


export default function DamageCalculator({ configs, allMoves }: DamageCalculatorProps) {
    const [selectedConfig, setSelectedConfig] = useState<string>('');
    const [currentConfig, setCurrentConfig] = useState<UserPokemonConfig | null>(null);
    const [baseStats, setBaseStats] = useState<PokemonStats | null>(null);
    const [isEnvCollapsed, setIsEnvCollapsed] = useState<boolean>(true); // Default minimized

    // Opponent Edit Mode States
    const [editMode, setEditMode] = useState<'user' | 'opponent' | 'manage'>('user');
    const [selectedOpponent, setSelectedOpponent] = useState<string>('');
    const [opponentConfig, setOpponentConfig] = useState<UserPokemonConfig | null>(null);
    const [opponentBaseStats, setOpponentBaseStats] = useState<PokemonStats | null>(null);
    const [opponentOverrides, setOpponentOverrides] = useState<(UserPokemonConfig & { id: string; customLabel?: string })[]>([]);
    const [customLabel, setCustomLabel] = useState<string>('');
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // New Opponent Manager States
    const [metaOpponents, setMetaOpponents] = useState<(UserPokemonConfig & { id: string; extraLabel?: string })[]>([]); // We add ID to meta too for tracking
    const [allSpeciesList, setAllSpeciesList] = useState<string[]>([]);
    const [excludedIds, setExcludedIds] = useState<string[]>([]); // IDs of opponents to SKIP
    const [filterText, setFilterText] = useState<string>('');
    const [hitCount, setHitCount] = useState<number>(5); // Default to 5 (Max) as per user sentiment "forces 5". Or user might want 2-5? 
    // User said "5回充てるタイプの連続技は回数を指定できるようにしよう".
    const [calcSettings, setCalcSettings] = useState<CalculationSettings>({ abilityVariantMode: 'default', teraVariantMode: 'default', hitCount: 5 });
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'none'>('none'); // Sorting state

    // Sync hitCount to calcSettings when hitCount changes
    useEffect(() => {
        setCalcSettings(prev => ({ ...prev, hitCount }));
    }, [hitCount]);

    useEffect(() => {
        // Fetch Meta Opponents and All Species on mount
        getMetaOpponents().then(res => {
            if (res.success && res.data) {
                // Assign stable IDs to Meta Opponents
                const metas = res.data.map((m: any, idx: number) => ({
                    ...m,
                    id: `meta-${m.species}-${idx}`, // Deterministic ID
                    // Ensure extraLabel exists
                    extraLabel: m.extraLabel
                }));
                setMetaOpponents(metas);
            }
        });
        getAllSpecies().then(res => {
            if (res.success && res.data) setAllSpeciesList(res.data);
        });
        getTranslationData().then(async (res) => {
            const { registerTranslations } = await import('@/core/translator');
            registerTranslations(res.pokemon);
            registerTranslations(res.moves); // Also moves
        });
    }, []);

    // Derived Active State
    const activeConfig = editMode === 'user' ? currentConfig : opponentConfig;
    const activeBaseStats = editMode === 'user' ? baseStats : opponentBaseStats;
    const updateActiveConfig = (cfg: UserPokemonConfig | null) => {
        if (editMode === 'user') setCurrentConfig(cfg);
        else setOpponentConfig(cfg);
    };

    const [isPending, startTransition] = useTransition();
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'attack' | 'defense' | 'defenseLine' | 'offensiveLine'>('attack');
    const [availableMoves, setAvailableMoves] = useState<string[]>(allMoves);
    const [availableAbilities, setAvailableAbilities] = useState<string[]>([]);
    const [isThinkingMoves, setIsThinkingMoves] = useState(false);

    // NEW: Fetch full translations on mount
    useEffect(() => {
        startTransition(async () => {
            const { getTranslationData } = await import('@/app/actions');
            const { registerTranslations } = await import('@/core/translator');
            const data = await getTranslationData();
            registerTranslations({ ...data.pokemon, ...data.moves, ...data.abilities });
        });
    }, []);

    // Effect: Fetch learnset when species changes
    useEffect(() => {
        if (!activeConfig) return;
        const species = activeConfig.species;

        setIsThinkingMoves(true);
        startTransition(async () => {
            // Dynamic import to avoid huge bundle
            const { getLearnset } = await import('@/app/actions');
            const learned = await getLearnset(species);

            if (learned && learned.length > 0) {
                setAvailableMoves(learned);
            } else {
                setAvailableMoves(allMoves);
            }
            setIsThinkingMoves(false);
        });
    }, [activeConfig?.species]);



    // Global Field State (v2.4)
    const [globalField, setGlobalField] = useState<GlobalFieldState>({
        weather: 'None',
        terrain: 'None',
        userSide: { isReflect: false, isLightScreen: false, isFriendGuard: false, isHelpingHand: false },
        opponentSide: { isReflect: false, isLightScreen: false, isFriendGuard: false },
        global: { isSwordOfRuin: false, isBeadsOfRuin: false, isTabletsOfRuin: false, isVesselOfRuin: false, isSpreadDamage: true },
        opponentRanks: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    });

    // Force re-render on mount
    // Force re-render on mount
    useEffect(() => {
    }, []);

    // Constants
    const TERA_TYPES = [
        'Normal', 'Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Fighting', 'Poison', 'Ground',
        'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy', 'Stellar'
    ];

    const RELEVANT_ITEMS = [
        '', // None
        'Choice Specs', 'Choice Band', 'Choice Scarf',
        'Life Orb', 'Assault Vest', 'Focus Sash',
        'Booster Energy', 'Clear Amulet', 'Covert Cloak',
        'Leftovers', 'Sitrus Berry', 'Rocky Helmet',
        'Expert Belt', 'Black Glasses', 'Charcoal', 'Mystic Water', 'Miracle Seed', 'Magnet',
        'Sharp Beak', 'Twisted Spoon', 'Never-Melt Ice', 'Dragon Claw', 'Silk Scarf',
        'Weakness Policy', 'Light Clay', 'Throat Spray'
    ];

    // Load config handler
    const handleLoadConfig = (speciesOrFile: string) => {
        handleLoadUserPokemon(speciesOrFile);
    };

    const handleLoadUserPokemon = (inputVal: string) => {
        setSelectedConfig(inputVal);

        startTransition(async () => {
            const { toEnglish } = await import('@/core/translator');
            const engSpecies = toEnglish(inputVal) || inputVal;

            // 1. Check if a Config exists (legacy check)
            const potentialConfig = engSpecies.toLowerCase().replace(/ /g, '_');
            if (configs.includes(potentialConfig)) {
                const res = await loadConfig(potentialConfig);
                if (res.success && res.data) {
                    // USER REQUEST: Do not load default moves (they are often English and user said maybe not needed).
                    setCurrentConfig({ ...res.data, moves: ['', '', '', ''] });
                    if (res.baseStats) setBaseStats(res.baseStats);
                    // Fetch abilities for the species
                    const dataRes = await getPokemonData(engSpecies);
                    if (dataRes.success && dataRes.data && dataRes.data.abilities) {
                        const abilities = Object.values(dataRes.data.abilities) as string[];
                        setAvailableAbilities(abilities);
                        // Fix for persistant ability bug:
                        // If current config's ability is not in the new species' valid abilities, default to first one.
                        if (!abilities.includes(res.data.ability)) {
                            // Actually, if we loaded a config, it SHOULD have a valid ability.
                            // But if we are switching from a Mon with 'Intimidate' to one without, and the loaded config doesn't specify ability...
                            // Wait, loadConfig returns a full UserPokemonConfig object.
                            // If res.data.ability is consistent with the species, we are good.
                            // However, if we just rely on `setCurrentConfig(res.data)`, React state update should handle it.
                            // The issue might be when we create a DEFAULT config below.
                        }
                    }
                    setError(null);
                    return;
                }
            }

            // 2. If no config exists, generate default (AS/CS)
            if (!engSpecies) return;

            const dataRes = await getPokemonData(engSpecies);
            if (dataRes.success && dataRes.data) {
                const bs = dataRes.data.baseStats;

                // AS or CS?
                // If Atk >= SpA, assume Physical (AS)
                const isPhysical = bs.atk >= bs.spa;

                const defaultEVs = {
                    hp: 4,
                    atk: isPhysical ? 252 : 0,
                    def: 0,
                    spa: isPhysical ? 0 : 252,
                    spd: 0,
                    spe: 252
                };

                const defaultIVs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

                // Tera Type: First Type
                const primaryType = dataRes.data.types[0];

                // Nature: Jolly (+Spe, -SpA) or Timid (+Spe, -Atk)
                const nature = isPhysical ? 'Jolly' : 'Timid';

                const newConfig: UserPokemonConfig = {
                    species: dataRes.data.species,
                    item: '',
                    // FIX: Explicitly set default ability to the first one available
                    ability: dataRes.data.abilities?.['0'] || '',
                    evs: defaultEVs,
                    ivs: defaultIVs,
                    nature: nature,
                    teraType: primaryType,
                    moves: ['', '', '', '']
                };

                setCurrentConfig(newConfig);
                setBaseStats(bs);
                if (dataRes.data.abilities) {
                    // Extract values from abilities object (0, 1, H, S)
                    setAvailableAbilities(Object.values(dataRes.data.abilities));
                }
                setError(null);

            } else {
                // Species not found
            }
        });
    };

    const handleLoadOpponent = async (rawName: string) => {
        setSelectedOpponent(rawName);

        // Import translator
        const { t, toEnglish } = await import('@/core/translator');
        const name = toEnglish(rawName);

        // 1. Check Meta List (In-Memory)
        // Check against English species (name)
        const meta = metaOpponents.find(m => m.species === name);
        if (meta) {
            const movesTranslated = meta.moves.map(m => t(m));
            while (movesTranslated.length < 4) movesTranslated.push("");

            setOpponentConfig({ ...meta, moves: movesTranslated });

            // Fetch base stats for Meta mon
            const basic = await getPokemonData(meta.species);
            if (basic.success && basic.data) {
                setOpponentBaseStats(basic.data.baseStats);
                if (basic.data.abilities) {
                    // FIX: Update available abilities for opponent edit mode
                    const abilities = Object.values(basic.data.abilities) as string[];
                    setAvailableAbilities(abilities);
                }
            }
            return;
        }

        startTransition(async () => {
            // 2. Try loading specific config file (using raw name if it's a file key, or english name?)
            // Configs are usually filenames. Filenames are usually English (e.g. flutter_mane_specs).
            // But if user typed Japanese, toEnglish might translate it.
            // Let's try english name for config load.
            let result = await loadConfig(name);

            // 3. Fallback to generic data
            if (!result.success || !result.data) {
                const basicData = await getPokemonData(name);
                if (basicData.success && basicData.data) {
                    const d = basicData.data;
                    result = {
                        success: true,
                        baseStats: d.baseStats,
                        data: {
                            species: d.species,
                            item: '',
                            nature: 'Serious',
                            ability: d.abilities?.[0] || '',
                            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
                            ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
                            moves: [],
                            teraType: d.types[0] // Default tera
                        }
                    };
                }
            }

            if (result.success && result.data) {
                const movesList = result.data.moves || [];
                const movesTranslated = movesList.map((m: string) => t(m));
                while (movesTranslated.length < 4) movesTranslated.push("");

                setOpponentConfig({ ...result.data, moves: movesTranslated });
                if (result.baseStats) setOpponentBaseStats(result.baseStats);
                if (result.baseStats) setOpponentBaseStats(result.baseStats);

                // FIX: Fetch abilities for custom opponent
                const abilityData = await getPokemonData(name);
                if (abilityData.success && abilityData.data?.abilities) {
                    const abilities = Object.values(abilityData.data.abilities) as string[];
                    setAvailableAbilities(abilities);
                }

                setSaveMessage(null);
            }
        });
    };

    const handleEditOpponent = async (opp: UserPokemonConfig & { id: string; extraLabel?: string; customLabel?: string }) => {
        console.log('[DEBUG] handleEditOpponent:', opp.id, opp.species);
        // Load config into editor
        setOpponentConfig({
            ...opp,
            // Ensure moves are translated if coming from Meta (which are English)
            // But opponents in list already have translated display?
            // UserPokemonConfig stores keys (English).
            // We need to translate them for the UI input fields.
            moves: opp.moves // Temporarily raw
        });

        // Translate moves
        const { t } = await import('@/core/translator');
        const movesTranslated = opp.moves.map(m => t(m));
        while (movesTranslated.length < 4) movesTranslated.push("");
        setOpponentConfig({ ...opp, moves: movesTranslated });

        setCustomLabel((opp as any).customLabel || opp.extraLabel?.replace(/[()]/g, '') || '');
        setEditMode('opponent');

        // Fetch Stats & Abilities for editing
        const basic = await getPokemonData(opp.species);
        if (basic.success && basic.data) {
            setOpponentBaseStats(basic.data.baseStats);
            if (basic.data.abilities) {
                const abilities = Object.values(basic.data.abilities) as string[];
                setAvailableAbilities(abilities);
            }
        }
    };

    const handleUpdateCustomOpponent = () => {
        if (!opponentConfig) return;
        const targetId = (opponentConfig as any).id;
        if (!targetId) return;

        // 1. Identify Siblings (Same Species & Item)
        // Improved Logic: Use the ORIGINAL Item from the Meta definition (if available) to find siblings.
        // This allows Sync to work even if the user CHANGES the Item during the edit.

        let searchSpecies = opponentConfig.species;
        let searchItem = opponentConfig.item;

        // Try to find the original meta definition by ID
        const originalMeta = metaOpponents.find(m => m.id === targetId);
        if (originalMeta) {
            searchSpecies = originalMeta.species;
            searchItem = originalMeta.item;
        }

        // Find all Meta definitions that match the Original Species + Item
        const siblings = metaOpponents.filter(m =>
            m.species === searchSpecies &&
            m.item === searchItem
        );

        // If the current target is NOT in meta (pure custom), we assume no siblings?
        // Or if we changed the Item, we might lose sync with siblings.
        // For now, let's just Sync all Metas that match Species+Item.

        // We perform an update for EACH sibling found + the target itself.
        // If targetId is not in siblings (e.g. modified item), we still update targetId.

        const idsToUpdate = new Set<string>();
        idsToUpdate.add(targetId);
        siblings.forEach(s => idsToUpdate.add(s.id));

        setOpponentOverrides(prev => {
            const next = [...prev];

            idsToUpdate.forEach(id => {
                // Determine the base to preserve (Label etc)
                // If it's the target, we use opponentConfig.
                // If it's a sibling, we need to preserve its specific label (e.g. "Inactive").

                // Try to find existing override for this ID
                const existingIdx = next.findIndex(o => o.id === id);

                // If it's the main target, we have the full new config in 'opponentConfig'
                if (id === targetId) {
                    const updated = {
                        ...opponentConfig,
                        customLabel: customLabel.trim() || undefined
                    };
                    if (existingIdx >= 0) next[existingIdx] = updated as any;
                    else next.push(updated as any);
                } else {
                    // It's a sibling. We need to copy stats from 'opponentConfig' but keep ID and Label.
                    // Recover sibling's original metadata (Label) from Meta list
                    const metaSibling = metaOpponents.find(m => m.id === id);
                    if (metaSibling) {
                        const siblingUpdate = {
                            ...opponentConfig, // Copy new stats
                            id: id,            // Restore ID
                            extraLabel: metaSibling.extraLabel, // Restore Sibling Label (e.g. Inactive)
                            customLabel: undefined // Metadata ones usually don't have custom labels unless user added one?
                            // If user previously customized the sibling, we might overwrite it.
                            // But "Sync" implies we want them to match.
                        };
                        // Note: We do NOT copy 'customLabel' from the editor.

                        if (existingIdx >= 0) next[existingIdx] = siblingUpdate as any;
                        else next.push(siblingUpdate as any);
                    }
                }
            });

            return next;
        });

        setSaveMessage('Updated (Synced)!');
        setTimeout(() => setSaveMessage(null), 2000);
    };

    const handleAddCustomOpponent = () => {
        if (!opponentConfig) return;

        // Check for Variant Sets (Ability Branches)
        // If the Ability has branches (e.g. Intimidate -> Active / Inactive), add BOTH.
        const branchFn = AbilityBranches[opponentConfig.ability];

        if (branchFn) {
            // Generate variants
            // We mock a MetaPokemonVariant since UserPokemonConfig is compatible enough for this logic
            const branches = branchFn(opponentConfig as any);

            const newOverrides = branches.map((b, idx) => ({
                ...opponentConfig, // Keep user edits (stats etc)
                ...b,             // Apply branch specifics (extraLabel, forcedField)
                // We need to merge overrides? 
                // AbilityBranches returns objects with 'extraLabel' and 'forcedField'.
                // It does NOT usually change stats.
                id: (Date.now() + idx).toString(),
                customLabel: (customLabel.trim() ? `${customLabel.trim()} ` : '') + (b.extraLabel || '').replace(/[()]/g, ''),
                // Ensure field flags are stored? 
                // Currently UserPokemonConfig doesn't explicitly have 'forcedField'.
                // But we can store it in the object and handle it in calculation (logic.ts supports it if passed).
                // Actually, logic.ts needs to know about it.
                // For now, we rely on the label or just storing the extra props.
            }));

            setOpponentOverrides(prev => [...prev, ...newOverrides as any]);
            setSaveMessage(`Added Set (${newOverrides.length})!`);

        } else {
            // Standard Single Add
            const newOverride = {
                ...opponentConfig,
                id: Date.now().toString(),
                customLabel: customLabel.trim() || undefined
            };
            setOpponentOverrides(prev => [...prev, newOverride as any]);
            setSaveMessage('Added New!');
        }

        setTimeout(() => setSaveMessage(null), 2000);
        // Do NOT clear label if user wants to add multiple variations?
        // Usually clearing is good.
    };

    const handleDeleteOverride = (id: string) => {
        setOpponentOverrides(prev => prev.filter(o => o.id !== id));
    };

    // ...


    // Worker Reference
    const workerRef = useMemo(() => {
        if (typeof window !== 'undefined') {
            return new Worker(new URL('../workers/calc.worker.ts', import.meta.url));
        }
        return null;
    }, []);

    useEffect(() => {
        if (!workerRef) return;

        workerRef.onmessage = (e) => {
            const { success, data, error, requestId } = e.data;
            if (success) {
                setResults(data);
                setError(null);
            } else {
                setError(error || 'Calculation failed');
            }
            // setIsPending(false); // If we tracked pending state manually
            // Since we use startTransition for server actions, for worker we might want a manual state or just rely on React state updates.
        };

        return () => {
            workerRef.terminate(); // Cleanup? Actually we shouldn't terminate if we want to reuse. 
            // Reuse is better. But useEffect cleanup usually terminates.
            // Let's NOT terminate on unmount unless necessary, but strict mode mounts twice.
            // Let's assign onmessage here.
        };
    }, [workerRef]);

    const handleCalculate = () => {
        if (!currentConfig || !workerRef) return;

        // Manual "Pending" Simulation using Transition for UI consistency?
        // Or just let UI update when results come in.
        // We set results to null to show loading?
        setResults(null);

        startTransition(async () => {
            const { toEnglish } = await import('@/core/translator');
            // Reverse translate moves for calculation
            const calculationConfig = {
                ...currentConfig,
                species: toEnglish(currentConfig.species),
                moves: currentConfig.moves.map(m => toEnglish(m))
            };

            // 1. Combine Meta + Custom (Shadowing Logic)
            const overriddenIds = new Set(opponentOverrides.map(o => o.id));
            // Only include Meta that are NOT overridden
            const activeMetas = metaOpponents.filter(m => !overriddenIds.has(m.id));

            const combined = [
                ...activeMetas,
                ...opponentOverrides.map(o => ({
                    ...o,
                    extraLabel: o.customLabel ? `(${o.customLabel})` : '(User Config)'
                }))
            ];

            // 2. Filter Excluded
            const activeOpps = combined.filter(o => !excludedIds.includes(o.id));

            // 3. Process (Translate Moves)
            const processedOpponents = activeOpps.map(o => ({
                ...o,
                species: toEnglish(o.species), // Use English species for calc
                moves: o.moves.map(m => toEnglish(m))
            }));

            // SERVER ACTION CALL (Restored)
            // Note: The logic.ts optimization applies here too!
            const res = await calculateCustom(calculationConfig, globalField, processedOpponents, calcSettings);
            if (res.success) {
                setResults(res.data);
                setError(null);
            } else {
                setError(res.error || 'Calculation failed');
            }
        });
    };

    const getTotalEVs = () => {
        if (!activeConfig) return 0;
        return Object.values(activeConfig.evs).reduce((a, b) => a + b, 0);
    };

    const updateEV = (stat: keyof PokemonStats, value: number) => {
        if (!activeConfig) return;

        // 1. Enforce Max 252 (and min 0)
        let newValue = Math.max(0, Math.min(252, value));

        // 2. Snap to efficient Level 50 EVs (0, 4, 12, 20, 28...)
        if (newValue !== 0) {
            // If close to 0 (e.g. 1-2), go to 0. 
            // Logic: 0 -> next is 4. Midpoint is 2.
            if (newValue <= 2) {
                newValue = 0;
            } else {
                // Formula: 4 + 8k. k = round((val - 4)/8).
                const k = Math.round((newValue - 4) / 8);
                newValue = 4 + 8 * k;
                // Clamp again just in case snap pushed it over (e.g. 252 -> 252 is ok. 4+8*31 = 252. perfect.)
                newValue = Math.max(4, Math.min(252, newValue));
            }
        }

        // 3. Enforce Global 510 Limit
        const currentTotal = getTotalEVs();
        const currentVal = activeConfig.evs[stat];
        const budget = 510 - (currentTotal - currentVal);

        if (newValue > budget) {
            newValue = budget;
        }

        updateActiveConfig({
            ...activeConfig,
            evs: { ...activeConfig.evs, [stat]: newValue }
        });
    };

    const getNatureMultiplier = (nature: string, stat: keyof PokemonStats): number => {
        const plus: Record<string, keyof PokemonStats> = {
            'Adamant': 'atk', 'Lonely': 'atk', 'Brave': 'atk', 'Naughty': 'atk',
            'Bold': 'def', 'Relaxed': 'def', 'Impish': 'def', 'Lax': 'def',
            'Modest': 'spa', 'Mild': 'spa', 'Quiet': 'spa', 'Rash': 'spa',
            'Calm': 'spd', 'Gentle': 'spd', 'Sassy': 'spd', 'Careful': 'spd',
            'Timid': 'spe', 'Hasty': 'spe', 'Jolly': 'spe', 'Naive': 'spe'
        };
        const minus: Record<string, keyof PokemonStats> = {
            'Modest': 'atk', 'Timid': 'atk', 'Calm': 'atk', 'Bold': 'atk',
            'Adamant': 'spa', 'Impish': 'spa', 'Jolly': 'spa', 'Careful': 'spa',
            'Lonely': 'def', 'Hasty': 'def', 'Mild': 'def', 'Gentle': 'def',
            'Naughty': 'spd', 'Rash': 'spd', 'Lax': 'spd', 'Naive': 'spd',
            'Brave': 'spe', 'Relaxed': 'spe', 'Quiet': 'spe', 'Sassy': 'spe'
        };

        if (plus[nature] === stat) return 1.1;
        if (minus[nature] === stat) return 0.9;
        return 1.0;
    }

    const calcRealStat = (stat: keyof PokemonStats, base: number, ev: number, iv: number, nature: string) => {
        const level = 50;
        if (stat === 'hp') {
            return Math.floor((base * 2 + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
        } else {
            const val = Math.floor((base * 2 + iv + Math.floor(ev / 4)) * level / 100) + 5;
            return Math.floor(val * getNatureMultiplier(nature, stat));
        }
    }

    const updateIV = (stat: keyof PokemonStats, value: number) => {
        if (!activeConfig) return;
        const currentIVs = activeConfig.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
        updateActiveConfig({
            ...activeConfig,
            ivs: { ...currentIVs, [stat]: value }
        });
    };

    const renderStatSlider = (label: string, stat: keyof PokemonStats) => {
        if (!activeConfig) return null;
        const ev = activeConfig.evs[stat];
        const iv = activeConfig.ivs?.[stat] ?? 31;
        const base = activeBaseStats?.[stat] ?? 100; // Fallback 100
        const real = calcRealStat(stat, base, ev, iv, activeConfig.nature);

        return (
            <div className="flex items-center space-x-4 py-1" key={stat}>
                <span className="w-12 text-sm font-bold text-gray-400">{label}</span>

                {/* Real Stat Display */}
                <div className="w-12 text-center">
                    <span className="text-lg font-bold text-white">{real}</span>
                </div>

                {/* EV Input */}
                <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500">努力値</span>
                    <input
                        type="number"
                        min="0" max="252" step="4"
                        value={ev}
                        onChange={(e) => updateEV(stat, Number(e.target.value))}
                        className="w-16 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-center text-white focus:border-pink-500 focus:outline-none"
                    />
                </div>

                {/* Slider */}
                <input
                    type="range"
                    min="0" max="252" step="4"
                    value={ev}
                    onChange={(e) => updateEV(stat, Number(e.target.value))}
                    className="flex-grow h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />

                {/* IV Input */}
                <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500">個体値</span>
                    <input
                        type="number"
                        min="0" max="31"
                        value={iv}
                        onChange={(e) => updateIV(stat, Number(e.target.value))}
                        className="w-12 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-center text-gray-300 focus:border-purple-500 focus:outline-none"
                    />
                </div>
            </div>
        );
    };

    const renderRankSelect = (label: string, stat: keyof PokemonStats, isOpponent: boolean = false) => {
        const val = isOpponent
            ? (globalField.opponentRanks?.[stat] || 0)
            : (activeConfig?.ranks?.[stat] || 0);

        const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newVal = Number(e.target.value);
            if (isOpponent) {
                setGlobalField({
                    ...globalField,
                    opponentRanks: { ...globalField.opponentRanks, [stat]: newVal } as PokemonStats
                });
            } else if (activeConfig) {
                updateActiveConfig({
                    ...activeConfig,
                    ranks: { ...activeConfig.ranks, [stat]: newVal } as PokemonStats
                });
            }
        };

        const colorClass = isOpponent ? "border-purple-600 focus:border-purple-400" : "border-pink-600 focus:border-pink-400";

        return (
            <div className="flex-1 flex flex-col items-center space-y-1" key={`${isOpponent ? 'opp' : 'user'}-${stat}`}>
                <span className="text-xs text-gray-400">{label}</span>
                <select
                    value={val}
                    onChange={onChange}
                    className={`bg-gray-800 border ${colorClass} rounded px-1 py-1 text-xs text-white focus:outline-none w-14 text-center`}
                >
                    {[6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6].map(v => (
                        <option key={v} value={v}>{v > 0 ? `+${v}` : v}</option>
                    ))}
                </select>
            </div>
        );
    };
    // Helper for Sorting
    const getSortedRows = (rows: any[]) => {
        if (sortOrder === 'none' || !rows) return rows;
        return [...rows].sort((a, b) => {
            const valA = a._sortVal ?? 0;
            const valB = b._sortVal ?? 0;
            if (sortOrder === 'desc') return valB - valA; // High SortVal (Hardest) first
            return valA - valB; // Low SortVal (Easiest) first
        });
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
            {/* Header Section */}
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
                    ダメージ一括計算機 v2.3 (Adjustable)
                </h1>
                <p className="text-base text-gray-400 max-w-2xl mx-auto">
                    環境上位の主要ポケモンに対するダメージを一括計算し、<br />
                    最適な<b>攻撃・防御ライン（調整）</b>を効率よく検討するためのツールです。<br />
                    <span className="text-sm opacity-80">※登録値・特化・無補正などの条件別ダメージや確定数を一覧で確認できます。</span>
                </p>
            </div>

            {/* Control Panel */}
            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-6 shadow-xl">

                {/* MODE TABS */}
                <div className="flex border-b border-gray-700 mb-6 space-x-4">
                    <button
                        onClick={() => setEditMode('user')}
                        className={`pb-2 px-4 transition-colors font-bold ${editMode === 'user' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-400 hover:text-white'}`}
                    >
                        自分のポケモン
                    </button>
                    <button
                        onClick={() => setEditMode('opponent')}
                        className={`pb-2 px-4 transition-colors font-bold ${editMode === 'opponent' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}
                    >
                        相手ポケモンを追加
                    </button>
                    <button
                        onClick={() => setEditMode('manage')}
                        className={`pb-2 px-4 transition-colors font-bold ${editMode === 'manage' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}
                    >
                        相手ポケモンリスト
                    </button>
                </div>



                {/* Manage Mode UI */}
                {editMode === 'manage' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex gap-4 items-center bg-gray-900/40 p-4 rounded-xl border border-gray-600 shadow-sm mb-4">
                            <div className="flex-grow relative group">
                                <input
                                    type="text"
                                    placeholder="リスト内を検索 (名前・持ち物・テラス)..."
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    className="block w-full px-3 py-3 border border-gray-600 rounded-lg leading-5 bg-gray-800 text-gray-100 placeholder-gray-400 focus:outline-none focus:bg-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-lg transition-all shadow-inner"
                                />
                            </div>
                            <div className="text-sm font-medium text-gray-400 whitespace-nowrap bg-gray-800 px-3 py-2 rounded border border-gray-700">
                                <span className="text-gray-500 text-xs block text-center">HIT</span>
                                {[...metaOpponents, ...opponentOverrides].filter(o =>
                                    (t(o.species) + ((o as any).extraLabel || (o as any).customLabel || '') + t(o.item || '') + t(o.teraType || '')).toLowerCase().includes(filterText.toLowerCase())
                                ).length} <span className="text-xs">/ {[...metaOpponents, ...opponentOverrides].length}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {(() => {
                                // Logic: Preserve Order of Meta Opponents.
                                // 1. Map Meta List: If overridden, show Override. Else show Meta.
                                const overriddenIds = new Set(opponentOverrides.map(o => o.id));
                                const metaDisplay = metaOpponents.map(m => {
                                    if (overriddenIds.has(m.id)) {
                                        // Return the override
                                        const ov = opponentOverrides.find(o => o.id === m.id);
                                        return { ...ov!, extraLabel: ov!.customLabel || m.extraLabel }; // Prefer custom label, else fallback
                                    }
                                    return m;
                                });

                                // 2. Append NEW Custom Opponents (IDs that are NOT in Meta List)
                                const metaIds = new Set(metaOpponents.map(m => m.id));
                                const newCustoms = opponentOverrides
                                    .filter(o => !metaIds.has(o.id))
                                    .map(o => ({ ...o, extraLabel: o.customLabel ? `(${o.customLabel})` : '(User Config)' }));

                                const displayList = [...metaDisplay, ...newCustoms];

                                return displayList
                                    .filter(o => (t(o.species) + (o.extraLabel || '') + t(o.item || '') + t(o.teraType || '')).toLowerCase().includes(filterText.toLowerCase()))
                                    .map(o => {
                                        const isExcluded = excludedIds.includes(o.id);
                                        return (
                                            <div
                                                key={o.id}
                                                className={`
                                                    p-3 rounded-lg border transition-all duration-200 flex items-center justify-between group
                                                    ${isExcluded ? 'bg-gray-800/30 border-gray-700 text-gray-500' : 'bg-green-900/20 border-green-500/50 text-white'}
                                                `}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden cursor-pointer flex-grow"
                                                    onClick={() => {
                                                        const targetGroup = o.groupId;
                                                        let idsToToggle = [o.id];
                                                        if (targetGroup) {
                                                            // Find others with same group
                                                            idsToToggle = displayList.filter(d => d.groupId === targetGroup).map(d => d.id);
                                                        }
                                                        const isCurrentlyExcluded = excludedIds.includes(o.id);

                                                        setExcludedIds(prev => {
                                                            if (isCurrentlyExcluded) {
                                                                // Include (Remove from excluded)
                                                                return prev.filter(id => !idsToToggle.includes(id));
                                                            } else {
                                                                // Exclude (Add to excluded)
                                                                return [...new Set([...prev, ...idsToToggle])];
                                                            }
                                                        });
                                                    }}
                                                >
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${!isExcluded ? 'border-green-400 bg-green-400' : 'border-gray-500'}`}>
                                                        {!isExcluded && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                    </div>
                                                    <div className="flex-shrink-0 mr-3">
                                                        <img
                                                            src={`https://img.pokemondb.net/sprites/scarlet-violet/icon/${o.species.toLowerCase()
                                                                .replace(/ /g, '-')
                                                                .replace(/[.'’]/g, '')
                                                                .replace('-(active)', '')
                                                                .replace('-(inactive)', '')
                                                                .replace('-rapid-strike', '-rapid-strike') // consistency check
                                                                .replace('-single-strike', '-single-strike')
                                                                .replace('-crowned', '-crowned')
                                                                // Specific fixes if needed
                                                                .replace('calyrex-ice', 'calyrex-ice-rider')
                                                                .replace('calyrex-shadow', 'calyrex-shadow-rider')
                                                                .replace('urshifu-rapid-strike', 'urshifu-rapid-strike')
                                                                .replace('urshifu-single-strike', 'urshifu-single-strike')
                                                                .replace('landorus-therian', 'landorus-therian')
                                                                .replace('tornadus-therian', 'tornadus-therian')
                                                                }.png`}
                                                            alt={o.species}
                                                            className="w-8 h-8 object-contain pixelated" // pixelated for icons
                                                            loading="lazy"
                                                            onError={(e) => {
                                                                // Hide if failed
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col truncate">
                                                        <span className="font-bold truncate">{t(o.species)} <span className="text-xs font-normal opacity-70">{o.extraLabel}</span></span>
                                                        <span className="text-[10px] opacity-60 truncate">{t(o.item || 'No Item')} / {t(o.ability)}</span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    {/* Edit Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditOpponent(o as any);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-colors"
                                                        title="Edit configuration"
                                                    >
                                                        ✎
                                                    </button>

                                                    {/* Delete button (Custom) or Hide (Meta) is implicit via check, but explicit Trash? */}
                                                    {opponentOverrides.some(ov => ov.id === o.id) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm('Delete custom opponent?')) handleDeleteOverride(o.id);
                                                            }}
                                                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                                                            title="Delete"
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                            })()}
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-6">
                    {editMode !== 'manage' && (
                        <div className="p-4 bg-gray-900/40 rounded-xl border border-gray-700/30 space-y-4">
                            <h2 className="text-lg font-semibold text-blue-200 border-b border-gray-700 pb-2">
                                {editMode === 'user' ? '自分のポケモンを選択' : '相手ポケモンを選択'}
                            </h2>
                            <div className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="flex-grow w-full">
                                    {editMode === 'user' ? (
                                        <>
                                            {/* Autocomplete Combobox */}
                                            <AutocompleteInput
                                                value={selectedConfig}
                                                onChange={setSelectedConfig}
                                                onSelect={handleLoadUserPokemon}
                                                itemList={allSpeciesList}
                                                placeholder="Search My Pokemon (自分のポケモンを検索)..."
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <AutocompleteInput
                                                value={selectedOpponent}
                                                onChange={setSelectedOpponent}
                                                onSelect={handleLoadOpponent}
                                                itemList={allSpeciesList}
                                                placeholder="ポケモンを検索して追加..."
                                            />
                                        </>
                                    )}
                                </div>
                                <div className="w-full sm:w-auto flex flex-col gap-2">
                                    {/* Action Button */}
                                    {editMode === 'user' ? (
                                        <button
                                            onClick={handleCalculate}
                                            disabled={!currentConfig || isPending || !currentConfig.moves.some(m => m)}
                                            className={`w-full text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 ${!currentConfig || isPending || !currentConfig.moves.some(m => m)
                                                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                                : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-pink-500/20 whitespace-nowrap'
                                                }`}
                                        >
                                            {isPending ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Calculating...
                                                </span>
                                            ) : 'ダメ計'}
                                        </button>
                                    ) : (
                                        <div className="flex flex-col gap-2 w-full">
                                            <input
                                                type="text"
                                                placeholder="ラベル (例: スカーフ型, H252など)"
                                                value={customLabel}
                                                onChange={(e) => setCustomLabel(e.target.value)}
                                                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                                            />
                                            <div className="flex gap-2">
                                                {/* Show Update button if editing existing (Meta or Custom) */}
                                                {opponentConfig && (opponentConfig as any).id && (
                                                    <button
                                                        onClick={handleUpdateCustomOpponent}
                                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-2 rounded-lg shadow-lg"
                                                    >
                                                        更新
                                                    </button>
                                                )}
                                                <button
                                                    onClick={handleAddCustomOpponent}
                                                    disabled={!opponentConfig}
                                                    className={`flex-1 text-white font-bold py-3 px-2 rounded-lg shadow-lg transition-all ${!opponentConfig
                                                        ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
                                                        }`}
                                                >
                                                    {saveMessage || (opponentConfig && opponentOverrides.some(o => o.id === (opponentConfig as any).id) ? '別名で保存' : '追加')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {editMode === 'opponent' && (
                        <div className="space-y-4">
                            {opponentOverrides.length > 0 && (
                                <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-700/50">
                                    <span className="text-xs text-purple-300 font-bold block mb-2">Customized Opponents:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {opponentOverrides.map(o => (
                                            <div key={o.id} className="text-xs px-2 py-1 bg-purple-900/50 rounded border border-purple-500/30 text-purple-200 flex items-center gap-2">
                                                <span>{t(o.species)} {o.customLabel ? `(${o.customLabel})` : ''}</span>
                                                <span className="text-gray-400 text-[10px]">{t(o.item || 'None')}</span>
                                                <button
                                                    onClick={() => handleDeleteOverride(o.id)}
                                                    className="text-red-400 hover:text-red-200 font-bold px-1 ml-1"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}

                    {/* Stats Slider Section (activeConfig) */}
                    {activeConfig && (
                        <div className="p-4 bg-gray-900/40 rounded-xl border border-gray-700/30 space-y-4">
                            <div className="flex flex-wrap justify-between items-center border-b border-gray-700 pb-2 gap-4">
                                <h3 className={`text-lg font-semibold ${editMode === 'opponent' ? 'text-purple-200' : 'text-pink-200'}`}>
                                    ステータス調整 ({editMode === 'user' ? '自分のポケモン' : '相手のポケモン'})
                                    <span className={`ml-4 text-sm ${getTotalEVs() > 510 ? 'text-red-400' : 'text-gray-400'}`}>
                                        合計努力値: {getTotalEVs()}/510
                                    </span>
                                </h3>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Ability Selector */}
                                <div className="flex flex-col items-start space-y-1">
                                    <span className="text-xs text-gray-400">特性 (Ability)</span>
                                    <select
                                        value={activeConfig.ability || ''}
                                        onChange={(e) => updateActiveConfig({ ...activeConfig, ability: e.target.value })}
                                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-pink-500 w-full"
                                    >
                                        {availableAbilities.length > 0 ? (
                                            availableAbilities.map((ab, idx) => (
                                                <option key={`${ab}-${idx}`} value={ab}>{t(ab)}</option>
                                            ))
                                        ) : (
                                            // Fallback if no list available yet
                                            <option value={activeConfig.ability}>{t(activeConfig.ability)}</option>
                                        )}
                                    </select>
                                </div>

                                {/* Item Selector */}
                                <div className="flex flex-col items-start space-y-1">
                                    <span className="text-xs text-gray-400">持ち物 (Item)</span>
                                    <select
                                        value={activeConfig.item || ''}
                                        onChange={(e) => updateActiveConfig({ ...activeConfig, item: e.target.value })}
                                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-pink-500 w-full"
                                    >
                                        {REFINED_ITEMS.map((item) => (
                                            <option key={item} value={item}>{item === '' ? 'None' : t(item)}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Tera Selector */}
                                <div className="flex flex-col items-start space-y-1">
                                    <span className="text-xs text-gray-400">テラスタイプ</span>
                                    <select
                                        value={
                                            (activeConfig.species.includes('Terapagos') || activeConfig.species.includes('オーガポン')) // Ogerpon also fixed? User asked for Terapagos.
                                                && activeConfig.species.includes('Terapagos') ? 'Stellar' : (activeConfig.teraType || 'Stellar')
                                        }
                                        onChange={(e) => updateActiveConfig({ ...activeConfig, teraType: e.target.value })}
                                        disabled={activeConfig.species.includes('Terapagos')}
                                        className={`bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-pink-500 w-full ${activeConfig.species.includes('Terapagos') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {TERA_TYPES.map((type) => (
                                            <option key={type} value={type}>{type === 'Psychic' ? 'エスパー' : t(type)}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Nature Selector */}
                                <div className="flex flex-col items-start space-y-1">
                                    <span className="text-xs text-gray-400">性格 (Nature)</span>
                                    <select
                                        value={activeConfig.nature}
                                        onChange={(e) => updateActiveConfig({ ...activeConfig, nature: e.target.value })}
                                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-pink-500"
                                    >
                                        {[
                                            // A Up
                                            'Lonely', 'Adamant', 'Naughty', 'Brave',
                                            // B Up
                                            'Bold', 'Impish', 'Lax', 'Relaxed',
                                            // C Up
                                            'Modest', 'Mild', 'Rash', 'Quiet',
                                            // D Up
                                            'Calm', 'Gentle', 'Careful', 'Sassy',
                                            // S Up
                                            'Timid', 'Hasty', 'Jolly', 'Naive',
                                        ].map(n => (
                                            <option key={n} value={n}>{t(n)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>


                            {/* Moves Section */}
                            <div className="border-t border-gray-700 pt-4">
                                <h4 className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                                    技構成
                                    {isThinkingMoves && <span className="text-xs text-gray-500 animate-pulse">Loading learnset...</span>}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Array.from({ length: 4 }).map((_, index) => {
                                        const move = activeConfig?.moves[index] || '';
                                        // USER REQUEST: White color for all move labels (removed colored classes)

                                        return (
                                            <div key={index} className="flex flex-col space-y-1 w-full">
                                                <span className={`text-xs font-bold text-gray-400`}>技{index + 1}</span>
                                                <AutocompleteInput
                                                    value={move}
                                                    onChange={(val) => {
                                                        const newMoves = [...activeConfig.moves];
                                                        while (newMoves.length <= index) newMoves.push("");
                                                        newMoves[index] = val;
                                                        updateActiveConfig({ ...activeConfig, moves: newMoves });
                                                    }}
                                                    onSelect={(val) => {
                                                        const newMoves = [...activeConfig.moves];
                                                        while (newMoves.length <= index) newMoves.push("");
                                                        newMoves[index] = val;
                                                        updateActiveConfig({ ...activeConfig, moves: newMoves });
                                                    }}
                                                    itemList={availableMoves}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                                {/* Datalist removed */}
                            </div>

                            <div className="mb-4 pt-4 border-t border-gray-700">
                                <h4 className="text-sm font-bold text-gray-400 mb-2">ランク補正</h4>
                                <div className="flex w-full gap-2">
                                    {renderRankSelect('攻撃', 'atk')}
                                    {renderRankSelect('防御', 'def')}
                                    {renderRankSelect('特攻', 'spa')}
                                    {renderRankSelect('特防', 'spd')}
                                    {renderRankSelect('素早さ', 'spe')}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                {renderStatSlider('HP', 'hp')}
                                {renderStatSlider('攻撃', 'atk')}
                                {renderStatSlider('防御', 'def')}
                                {renderStatSlider('特攻', 'spa')}
                                {renderStatSlider('特防', 'spd')}
                                {renderStatSlider('素早さ', 'spe')}
                            </div>
                        </div>
                    )}

                    {editMode !== 'manage' && (
                        <div className="p-4 bg-gray-900/40 rounded-xl border border-gray-700/30 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-700 pb-2 cursor-pointer select-none" onClick={() => setIsEnvCollapsed(prev => !prev)}>
                                <h3 className="text-lg font-semibold text-blue-200">
                                    天候・フィールド・詳細設定
                                </h3>
                                <span className="text-blue-400 text-sm">
                                    {isEnvCollapsed ? "▼ 表示する" : "▲ 隠す"}
                                </span>
                            </div>
                            {!isEnvCollapsed && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                                        {/* Weather & Terrain */}
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-bold text-gray-400">天候</h4>
                                                <select
                                                    value={globalField.weather || 'None'}
                                                    onChange={(e) => setGlobalField({ ...globalField, weather: e.target.value as any })}
                                                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                                                >
                                                    <option value="None">なし / 自動</option>
                                                    <option value="Sun">晴れ</option>
                                                    <option value="Rain">雨</option>
                                                    <option value="Sand">砂嵐</option>
                                                    <option value="Snow">雪</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-bold text-gray-400">フィールド</h4>
                                                <select
                                                    value={globalField.terrain || 'None'}
                                                    onChange={(e) => setGlobalField({ ...globalField, terrain: e.target.value as any })}
                                                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:border-green-500 focus:outline-none"
                                                >
                                                    <option value="None">なし / 自動</option>
                                                    <option value="Electric">エレキフィールド</option>
                                                    <option value="Grassy">グラスフィールド</option>
                                                    <option value="Psychic">サイコフィールド</option>
                                                    <option value="Misty">ミストフィールド</option>
                                                </select>
                                            </div>
                                            {/* Spread Damage Rule */}
                                            <div className="space-y-1 pt-1">
                                                <h4 className="text-sm font-bold text-gray-400">ルール</h4>
                                                <label className="flex items-center space-x-2 cursor-pointer bg-gray-700/50 p-2 rounded border border-gray-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={globalField.global.isSpreadDamage ?? true}
                                                        onChange={(e) => setGlobalField({ ...globalField, global: { ...globalField.global, isSpreadDamage: e.target.checked } })}
                                                        className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-offset-gray-900"
                                                    />
                                                    <span className="text-sm text-gray-300">
                                                        全体技: ダブルダメージ<br />
                                                        (0.75倍補正あり)
                                                    </span>
                                                </label>
                                            </div>

                                            <div className="space-y-1">
                                                <h4 className="text-sm font-bold text-gray-400">連続技ヒット数</h4>
                                                <select
                                                    value={hitCount}
                                                    onChange={(e) => setHitCount(Number(e.target.value))}
                                                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:border-yellow-500 focus:outline-none"
                                                >
                                                    <option value={2}>2回</option>
                                                    <option value={3}>3回</option>
                                                    <option value={4}>4回</option>
                                                    <option value={5}>5回</option>
                                                </select>
                                                <p className="text-xs text-gray-500">※スキルリンクは常に5回</p>
                                            </div>
                                        </div>

                                        {/* Ally Side */}
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-bold text-gray-400">味方側</h4>
                                            <div className="space-y-1">
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={globalField.userSide.isReflect} onChange={(e) => setGlobalField({ ...globalField, userSide: { ...globalField.userSide, isReflect: e.target.checked } })} className="rounded bg-gray-700 border-gray-600 text-pink-500 focus:ring-offset-gray-900" />
                                                    <span className="text-sm text-gray-300">リフレクター</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={globalField.userSide.isLightScreen} onChange={(e) => setGlobalField({ ...globalField, userSide: { ...globalField.userSide, isLightScreen: e.target.checked } })} className="rounded bg-gray-700 border-gray-600 text-pink-500 focus:ring-offset-gray-900" />
                                                    <span className="text-sm text-gray-300">ひかりのかべ</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={globalField.userSide.isFriendGuard} onChange={(e) => setGlobalField({ ...globalField, userSide: { ...globalField.userSide, isFriendGuard: e.target.checked } })} className="rounded bg-gray-700 border-gray-600 text-pink-500 focus:ring-offset-gray-900" />
                                                    <span className="text-sm text-gray-300">フレンドガード</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={globalField.userSide.isHelpingHand} onChange={(e) => setGlobalField({ ...globalField, userSide: { ...globalField.userSide, isHelpingHand: e.target.checked } })} className="rounded bg-gray-700 border-gray-600 text-pink-500 focus:ring-offset-gray-900" />
                                                    <span className="text-sm text-gray-300">てだすけ</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Opponent Side */}
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-bold text-gray-400">相手側</h4>
                                            <div className="space-y-1">
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={globalField.opponentSide.isReflect} onChange={(e) => setGlobalField({ ...globalField, opponentSide: { ...globalField.opponentSide, isReflect: e.target.checked } })} className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-offset-gray-900" />
                                                    <span className="text-sm text-gray-300">リフレクター</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={globalField.opponentSide.isLightScreen} onChange={(e) => setGlobalField({ ...globalField, opponentSide: { ...globalField.opponentSide, isLightScreen: e.target.checked } })} className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-offset-gray-900" />
                                                    <span className="text-sm text-gray-300">ひかりのかべ</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={globalField.opponentSide.isFriendGuard} onChange={(e) => setGlobalField({ ...globalField, opponentSide: { ...globalField.opponentSide, isFriendGuard: e.target.checked } })} className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-offset-gray-900" />
                                                    <span className="text-sm text-gray-300">フレンドガード</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Global Ruins */}
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-bold text-gray-400">災い</h4>
                                            <div className="space-y-1">
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={globalField.global.isSwordOfRuin} onChange={(e) => setGlobalField({ ...globalField, global: { ...globalField.global, isSwordOfRuin: e.target.checked } })} className="rounded bg-gray-700 border-gray-600 text-red-500 focus:ring-offset-gray-900" />
                                                    <span className="text-sm text-gray-300">わざわいのつるぎ (B↓)</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={globalField.global.isBeadsOfRuin} onChange={(e) => setGlobalField({ ...globalField, global: { ...globalField.global, isBeadsOfRuin: e.target.checked } })} className="rounded bg-gray-700 border-gray-600 text-red-500 focus:ring-offset-gray-900" />
                                                    <span className="text-sm text-gray-300">わざわいのたま (D↓)</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={globalField.global.isTabletsOfRuin} onChange={(e) => setGlobalField({ ...globalField, global: { ...globalField.global, isTabletsOfRuin: e.target.checked } })} className="rounded bg-gray-700 border-gray-600 text-red-500 focus:ring-offset-gray-900" />
                                                    <span className="text-sm text-gray-300">わざわいのおふだ (A↓)</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={globalField.global.isVesselOfRuin} onChange={(e) => setGlobalField({ ...globalField, global: { ...globalField.global, isVesselOfRuin: e.target.checked } })} className="rounded bg-gray-700 border-gray-600 text-red-500 focus:ring-offset-gray-900" />
                                                    <span className="text-sm text-gray-300">わざわいのうつわ (C↓)</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Opponent Ranks */}

                                    {/* Opponent Ranks Restored */}
                                    <div className="border-t border-gray-700 pt-4 mt-2">
                                        <h4 className="text-sm font-bold text-gray-400 mb-2">敵全体のランク補正</h4>
                                        <div className="flex w-full gap-2">
                                            {renderRankSelect('攻撃', 'atk', true)}
                                            {renderRankSelect('防御', 'def', true)}
                                            {renderRankSelect('特攻', 'spa', true)}
                                            {renderRankSelect('特防', 'spd', true)}

                                            {renderRankSelect('素早さ', 'spe', true)}
                                        </div>
                                    </div>

                                    {/* Detailed Settings Toggle */}
                                    <div className="border-t border-gray-700 pt-4 mt-2">
                                        <h4 className="text-sm font-bold text-gray-400 mb-2">詳細設定 (表示切替)</h4>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="flex-1 space-y-1">
                                                <span className="text-xs text-gray-500">特性の分岐</span>
                                                <select
                                                    value={calcSettings.abilityVariantMode}
                                                    onChange={(e) => setCalcSettings({ ...calcSettings, abilityVariantMode: e.target.value as VariantFilterMode })}
                                                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                                                >
                                                    <option value="default">すべて (重複は省略)</option>
                                                    <option value="active-only">発動のみ (Active Only)</option>
                                                    <option value="inactive-only">未発動のみ (Inactive Only)</option>
                                                </select>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <span className="text-xs text-gray-500">テラスタルの分岐</span>
                                                <select
                                                    value={calcSettings.teraVariantMode}
                                                    onChange={(e) => setCalcSettings({ ...calcSettings, teraVariantMode: e.target.value as VariantFilterMode })}
                                                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                                                >
                                                    <option value="default">すべて (重複は省略)</option>
                                                    <option value="active-only">テラスタルのみ (Tera Only)</option>
                                                    <option value="inactive-only">テラスタルなし (No Tera)</option>
                                                </select>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <span className="text-xs text-gray-500">その他</span>
                                                <div className="flex items-center h-full">
                                                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                                                        <input
                                                            type="checkbox"
                                                            checked={calcSettings.excludeWeakMoves || false}
                                                            onChange={(e) => setCalcSettings({ ...calcSettings, excludeWeakMoves: e.target.checked })}
                                                            className="w-4 h-4 bg-gray-800 border border-gray-600 rounded focus:ring-1 focus:ring-blue-500"
                                                        />
                                                        確定3発以下を除外
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {error && (
                    <div className="mt-4 p-4 rounded-lg bg-red-900/20 border border-red-500/50 text-red-200 text-sm">
                        ERROR: {error}
                    </div>
                )}
            </div>

            {/* Results Section */}
            {
                results && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Tabs and Sort Control */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-end sm:items-center">
                            <div className="flex space-x-1 rounded-xl bg-gray-900/50 p-1 w-full sm:w-auto">
                                {(['attack', 'defense', 'offensiveLine', 'defenseLine'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => {
                                            setActiveTab(tab);
                                            // Reset sort when switching tabs? Or keep?
                                            // setSortOrder('desc'); 
                                        }}
                                        className={`px-4 rounded-lg py-2.5 text-sm font-medium leading-5 text-white ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${activeTab === tab
                                            ? 'bg-gray-700 shadow shadow-black/50'
                                            : 'text-gray-400 hover:bg-white/[0.12] hover:text-white'
                                            }`}
                                    >
                                        {tab === 'attack' ? 'Attack (攻)' : tab === 'defense' ? 'Defense (受)' : tab === 'offensiveLine' ? 'Off Lines (攻ライン)' : 'Def Lines (受ライン)'}
                                    </button>
                                ))}
                            </div>

                            {/* Sort Control (Only for Lines) */}
                            {['offensiveLine', 'defenseLine'].includes(activeTab) && (
                                <div className="flex items-center space-x-2 bg-gray-900/50 p-1 rounded-lg">
                                    <span className="text-xs text-gray-400 pl-2">並び替え:</span>
                                    <select
                                        value={sortOrder}
                                        onChange={(e) => setSortOrder(e.target.value as any)}
                                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="none">登録順 (Default)</option>
                                        <option value="desc">必要努力値が多い順 (Hardest)</option>
                                        <option value="asc">必要努力値が少ない順 (Easiest)</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="bg-gray-800/40 backdrop-blur-md rounded-2xl p-6 border border-gray-700/30 overflow-hidden">
                            <div className="overflow-x-auto min-w-full">
                                {activeTab === 'attack' && (
                                    <Table
                                        headers={HEADERS_ATTACK}
                                        rows={results.attack}
                                    />
                                )}
                                {activeTab === 'defense' && (
                                    <div className="space-y-8">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-200 mb-4 px-2 border-l-4 border-blue-500">Physical (物理)</h3>
                                            <Table
                                                headers={HEADERS_DEF_PHYS}
                                                rows={results.defense.physical}
                                            />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-200 mb-4 px-2 border-l-4 border-purple-500">Special (特殊)</h3>
                                            <Table
                                                headers={HEADERS_DEF_SPEC}
                                                rows={results.defense.special}
                                            />
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'offensiveLine' && (
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-200 mb-4 px-2 border-l-4 border-red-500">Offensive Requirement (火力ライン)</h3>
                                        <p className="text-sm text-gray-400 mb-4 ml-2">
                                            必要な努力値 (性格補正が必要な場合は補正後の値を表示 / 例: (Bold) 124)
                                        </p>
                                        <Table
                                            headers={HEADERS_OFF_LINE}
                                            rows={getSortedRows(results.offensiveLine)}
                                        />
                                    </div>
                                )}
                                {activeTab === 'defenseLine' && (
                                    <div className="space-y-8">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-200 mb-4 px-2 border-l-4 border-green-500">Physical Lines (物理ライン)</h3>
                                            <Table
                                                headers={HEADERS_DEF_LINE_PHYS}
                                                rows={getSortedRows(results.defenseLine.physical)}
                                                highlightEfficient
                                            />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-200 mb-4 px-2 border-l-4 border-yellow-500">Special Lines (特殊ライン)</h3>
                                            <Table
                                                headers={HEADERS_DEF_LINE_SPEC}
                                                rows={getSortedRows(results.defenseLine.special)}
                                                highlightEfficient
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
}

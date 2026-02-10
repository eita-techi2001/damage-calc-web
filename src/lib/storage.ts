import { BoxesState, PokemonBox, MetaPokemonVariant } from '@/types';

const STORAGE_KEY = 'pokemon-damage-calc-boxes';
const STORAGE_VERSION = 1;

/**
 * Load boxes from localStorage
 * Returns null if no data exists
 */
export function loadBoxes(): BoxesState | null {
    try {
        if (typeof window === 'undefined') return null;

        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;

        const data = JSON.parse(stored);
        if (data.version !== STORAGE_VERSION) {
            // Version mismatch - could implement migration here
            return null;
        }

        return data.state as BoxesState;
    } catch (error) {
        console.error('Failed to load boxes from localStorage:', error);
        return null;
    }
}

/**
 * Save boxes to localStorage
 */
export function saveBoxes(state: BoxesState): void {
    try {
        if (typeof window === 'undefined') return;

        const data = {
            version: STORAGE_VERSION,
            state,
            savedAt: Date.now(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save boxes to localStorage:', error);
        // Check if quota exceeded
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            alert('保存容量が上限に達しました。古いBoxを削除してください。');
        }
    }
}

/**
 * Get the active box from state
 */
export function getActiveBox(state: BoxesState): PokemonBox | null {
    return state.boxes.find(b => b.id === state.activeBoxId) || null;
}

/**
 * Create a new empty box
 */
export function createBox(name: string): PokemonBox {
    return {
        id: `box-${Date.now()}`,
        name,
        opponents: [],
        excludedIds: [],
        isDefault: false,
        createdAt: Date.now(),
    };
}

/**
 * Create the default box with meta opponents
 */
export function createDefaultBox(metaOpponents: MetaPokemonVariant[]): PokemonBox {
    return {
        id: 'default',
        name: '伝説レギュ上位',
        opponents: metaOpponents,
        excludedIds: [],
        isDefault: true,
        createdAt: Date.now(),
    };
}

/**
 * Initialize boxes state (called on app start)
 * Merges saved data with current meta opponents for default box
 */
export function initializeBoxes(metaOpponents: MetaPokemonVariant[]): BoxesState {
    const saved = loadBoxes();

    if (!saved) {
        // First time user - create default box
        const defaultBox = createDefaultBox(metaOpponents);
        return {
            boxes: [defaultBox],
            activeBoxId: 'default',
        };
    }

    // Ensure default box exists and is updated with latest meta
    const defaultBoxIndex = saved.boxes.findIndex(b => b.id === 'default');

    if (defaultBoxIndex === -1) {
        // Default box missing - recreate it
        const defaultBox = createDefaultBox(metaOpponents);
        saved.boxes.unshift(defaultBox);
    } else {
        // Update default box with latest meta opponents
        // Preserve any custom opponents user may have added
        const defaultBox = saved.boxes[defaultBoxIndex];

        // Separate custom opponents (those not in current meta)
        const metaIds = new Set(metaOpponents.map((_, idx) => `default-meta-${idx}`));
        const customOpponents = defaultBox.opponents.filter(o => {
            const id = (o as any).id;
            return id && !id.startsWith('default-meta-');
        }).map((o: any) => ({
            ...o,
            // Ensure level, ivs and ranks exist with defaults if missing
            level: o.level || 50,
            ivs: o.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            ranks: o.ranks || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
        }));

        // Merge: current meta + preserved custom
        defaultBox.opponents = [
            ...metaOpponents,
            ...customOpponents,
        ];
        defaultBox.createdAt = Date.now(); // Update timestamp
    }

    // Ensure all boxes have opponents with proper structure
    saved.boxes = saved.boxes.map(box => ({
        ...box,
        opponents: box.opponents.map((o: any) => ({
            ...o,
            // Ensure level, ivs and ranks exist with defaults if missing
            level: o.level || 50,
            ivs: o.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
            ranks: o.ranks || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
        }))
    }));

    // Ensure activeBoxId is valid
    if (!saved.boxes.find(b => b.id === saved.activeBoxId)) {
        saved.activeBoxId = 'default';
    }

    return saved;
}

/**
 * Clone a box
 */
export function cloneBox(box: PokemonBox, newName: string): PokemonBox {
    return {
        ...box,
        id: `box-${Date.now()}`,
        name: newName,
        isDefault: false,
        createdAt: Date.now(),
    };
}

/**
 * Export boxes state to JSON string (for backup/sharing)
 */
export function exportBoxes(state: BoxesState): string {
    return JSON.stringify(state, null, 2);
}

/**
 * Import boxes state from JSON string
 * Returns null if invalid
 */
export function importBoxes(json: string): BoxesState | null {
    try {
        const state = JSON.parse(json) as BoxesState;

        // Validate structure
        if (!state.boxes || !Array.isArray(state.boxes)) return null;
        if (!state.activeBoxId) return null;

        // Ensure all boxes have required fields
        for (const box of state.boxes) {
            if (!box.id || !box.name || !Array.isArray(box.opponents)) return null;
        }

        return state;
    } catch (error) {
        console.error('Failed to import boxes:', error);
        return null;
    }
}

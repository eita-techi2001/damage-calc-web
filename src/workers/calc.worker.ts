
import { calculateDamageForConfig } from '../lib/logic';
import { UserPokemonConfig, GlobalFieldState } from '../types';

// Worker Logic
self.onmessage = async (e: MessageEvent) => {
    const {
        config,
        globalField,
        opponentOverrides,
        requestId // Track requests to avoid race conditions
    } = e.data;

    try {
        console.time(`Calc-${requestId}`);

        // Run Calculation
        // Note: logic.ts imports translator.ts which uses 'registerTranslations'.
        // If we want translations in the worker, we might need to sync them.
        // But logic.ts mostly uses keys or data passed in.
        // It calls 't()' for labels.
        // We should ideally pass the translation dict to the worker if needed.
        // For now, let's assume default t() works (returns key) or we add a init step.

        const results = await calculateDamageForConfig(config, globalField, opponentOverrides);

        console.timeEnd(`Calc-${requestId}`);

        self.postMessage({
            success: true,
            data: results,
            requestId
        });

    } catch (error) {
        console.error('Worker Error:', error);
        self.postMessage({
            success: false,
            error: String(error),
            requestId
        });
    }
};

export { };

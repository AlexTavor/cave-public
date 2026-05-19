import { useCallback, useMemo, useRef } from "react";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import type { TraitDefinition } from "../../../../../data/schemas/game/traits";
import { useEntitySelector } from "../useEntitySelector";
import { analyzeEntityState } from "./entityAnalysis";
import type { EntityAnalysisResult } from "./entityAnalysis.types";
import { analysisResultEqual } from "./analysisComparer";

const EMPTY: EntityAnalysisResult = { modifiers: [], traits: [] };

export const useEntityAnalysis = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
    targetEntityId?: string,
): EntityAnalysisResult => {
    const traitIndex = useMemo<Record<string, TraitDefinition>>(() => {
        if (!runtime) return {};
        try {
            const cartridge = runtime.getCartridge();
            const rawSettings = cartridge.config?.settings as
                | Record<string, unknown>
                | undefined;
            const fromSettings = rawSettings?.traits as
                | Record<string, TraitDefinition>
                | undefined;
            return fromSettings ?? cartridge.config?.traits ?? {};
        } catch {
            return {};
        }
    }, [runtime]);

    const traitIndexRef = useRef(traitIndex);
    traitIndexRef.current = traitIndex;

    const selector = useCallback(
        (e: RuntimeEntity) => analyzeEntityState(e, traitIndexRef.current),
        [],
    );

    const snapshot = useEntitySelector(
        runtime,
        targetEntityId ?? entity.id,
        selector,
        analysisResultEqual,
    );

    return snapshot ?? EMPTY;
};

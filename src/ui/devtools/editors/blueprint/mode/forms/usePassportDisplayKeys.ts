import { useMemo } from "react";
import { useModuleStore } from "../../../../state/moduleStore";
import { useSessionStore } from "../../../../state/useSessionStore";
import { useEnsureModuleSession } from "../../../../state/moduleSession";
import { resolveVisualAssetFilename } from "../../visuals/visualAssetLinking";

export const usePassportDisplayKeys = (filename: string, value: string) => {
    const assetFilename = resolveVisualAssetFilename(filename);
    useEnsureModuleSession(assetFilename);
    const assetDraft = useSessionStore(
        (state) => state.sessions[assetFilename]?.draft ?? null,
    );
    const assetModule = useModuleStore(
        (state) => state.modules[assetFilename] ?? null,
    );
    const displayKeys = useMemo(() => {
        const keys = new Set<string>([
            ...Object.keys(assetModule?.assets?.displays ?? {}),
            ...Object.keys(assetDraft?.assets?.displays ?? {}),
        ]);
        if (value) keys.add(value);
        return [...keys].sort((left, right) => left.localeCompare(right));
    }, [assetDraft, assetModule, value]);
    return { assetFilename, displayKeys };
};

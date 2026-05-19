import type { ModuleCartridge } from "../../../../data/schemas/module";
import type { Session, SessionScopeId, SessionUiState } from "../sessionLogic";
import { deepClone } from "../../../../utils/objectUtils";
import { clearPersistedDraft, persistDraft } from "./storage";

const DEFAULT_UI_SCOPE = "__root__";

const areDraftsEqual = (a: ModuleCartridge, b: ModuleCartridge): boolean => {
    if (a === b) return true;
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    } catch {
        return false;
    }
};

const mergeMissingAssetEntries = (
    original: ModuleCartridge,
    persisted: ModuleCartridge,
) => {
    const nextDraft = deepClone(persisted);
    const originalAssets = original.assets;
    if (!nextDraft.assets) nextDraft.assets = original.assets ?? {};
    const nextAssets = nextDraft.assets as Record<string, unknown>;

    (["displays", "styles", "glyphs"] as const).forEach((bucketKey) => {
        const originalBucket = originalAssets?.[bucketKey];
        if (!originalBucket) return;
        if (!nextAssets[bucketKey]) nextAssets[bucketKey] = {};
        const nextBucket = nextAssets[bucketKey] as Record<string, unknown>;
        Object.entries(originalBucket).forEach(([key, value]) => {
            if (!(key in nextBucket)) nextBucket[key] = deepClone(value);
        });
    });

    return nextDraft;
};

export const applyPersistedDraft = (
    session: Session<ModuleCartridge>,
    persisted: ModuleCartridge,
) => {
    session.draft = mergeMissingAssetEntries(session.original, persisted);
    session.history.past = [];
    session.history.future = [];
    session.isDirty = true;
};

export const refreshDirtyState = (session: Session<ModuleCartridge>) => {
    session.isDirty = !areDraftsEqual(session.draft, session.original);
    if (session.isDirty) {
        persistDraft(session.id, session.draft);
    } else {
        clearPersistedDraft(session.id);
    }
};

export const ensureScopeUi = (
    session: Session<ModuleCartridge>,
    scopeId: SessionScopeId | null,
): SessionUiState => {
    const key = scopeId ?? DEFAULT_UI_SCOPE;
    session.ui[key] ??= { expandedRows: {} };
    return session.ui[key];
};


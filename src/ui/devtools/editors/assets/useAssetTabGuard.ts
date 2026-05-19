import { useCallback, useEffect, useRef } from "react";
import type { TabGuard } from "../../state/tabGuardStore";

type GuardActions = Pick<TabGuard, "requestSave" | "discardChanges">;
type GuardMeta = Pick<TabGuard, "tabId" | "title" | "isDirty">;

const sameMeta = (left: GuardMeta | null, right: GuardMeta) =>
    !!left &&
    left.tabId === right.tabId &&
    left.title === right.title &&
    left.isDirty === right.isDirty;

export const useAssetTabGuard = (params: {
    assetId: string;
    tabId?: string;
    isDirty: boolean;
    requestSave: () => Promise<void>;
    discardChanges: () => void;
    upsertGuard: (guard: TabGuard) => void;
    removeGuard: (tabId: string) => void;
}) => {
    const metaRef = useRef<GuardMeta | null>(null);
    const actionsRef = useRef<GuardActions>({
        requestSave: params.requestSave,
        discardChanges: params.discardChanges,
    });
    const requestSave = useCallback(
        () => actionsRef.current.requestSave?.() ?? Promise.resolve(),
        [],
    );
    const discardChanges = useCallback(
        () => actionsRef.current.discardChanges?.(),
        [],
    );
    const title = `Asset: ${params.assetId}`;

    useEffect(() => {
        actionsRef.current = {
            requestSave: params.requestSave,
            discardChanges: params.discardChanges,
        };
    }, [params.discardChanges, params.requestSave]);

    useEffect(() => {
        const { tabId } = params;
        if (!tabId) return;
        const guard = { tabId, title, isDirty: params.isDirty };
        metaRef.current = guard;
        params.upsertGuard({ ...guard, requestSave, discardChanges });
        return () => {
            metaRef.current = null;
            params.removeGuard(tabId);
        };
    }, [
        discardChanges,
        params.removeGuard,
        params.tabId,
        params.upsertGuard,
        requestSave,
        title,
    ]);

    useEffect(() => {
        if (!params.tabId) return;
        const next = { tabId: params.tabId, title, isDirty: params.isDirty };
        if (sameMeta(metaRef.current, next)) return;
        metaRef.current = next;
        params.upsertGuard({ ...next, requestSave, discardChanges });
    }, [
        discardChanges,
        params.isDirty,
        params.tabId,
        params.upsertGuard,
        requestSave,
        title,
    ]);
};

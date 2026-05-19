import { useCallback, useEffect, useMemo } from "react";
import { useSessionStore } from "../../state/useSessionStore";
import { useTabGuardStore } from "../../state/tabGuardStore";
import { useTerminalStore } from "../../state/useTerminalStore";
import {
    useEnsureModuleSession,
    useModuleSession,
} from "../../state/moduleSession";
import type {
    ImpulseSettingsSessionState,
    UseImpulseSettingsSessionParams,
} from "./useImpulseSettingsSession.types";

export function useImpulseSettingsSession({
    filename,
    tabId,
}: UseImpulseSettingsSessionParams): ImpulseSettingsSessionState {
    const { addLog } = useTerminalStore();

    useEnsureModuleSession(filename);
    const moduleSession = useModuleSession(filename);
    const { isReady, isDirty, save, discard } = moduleSession;

    const draft = useSessionStore(
        useCallback(
            (state) =>
                state.sessions[filename]?.draft.config?.settings?.impulse ??
                null,
            [filename],
        ),
    );

    const upsertGuard = useTabGuardStore((s) => s.upsertGuard);
    const removeGuard = useTabGuardStore((s) => s.removeGuard);

    const handleSave = useCallback(async () => {
        if (!draft || !isReady || !isDirty) return;
        try {
            await save();
            addLog({ type: "success", content: "Saved impulse settings." });
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            addLog({ type: "error", content: `Save failed: ${message}` });
        }
    }, [draft, isReady, isDirty, save, addLog]);

    useEffect(() => {
        if (!tabId) return;
        upsertGuard({
            tabId,
            title: "Impulse Settings",
            isDirty,
            requestSave: isDirty ? handleSave : async () => {},
            discardChanges: discard,
        });
        return () => removeGuard(tabId);
    }, [tabId, isDirty, handleSave, discard, upsertGuard, removeGuard]);

    return useMemo(
        () => ({
            isLoading: !isReady,
            draft,
            sessionId: filename,
        }),
        [isReady, draft, filename],
    );
}

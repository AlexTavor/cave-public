import { useCallback } from "react";
import { useBlueprintContext } from "../../BlueprintContext";
import { useBlueprintSlice } from "../../../../state/moduleSession/useBlueprintSlice";
import { useSessionStore } from "../../../../state/useSessionStore";
import { useModuleStore } from "../../../../state/moduleStore";
import { useShellStore } from "../../../../shell/shell";

export const useEjectBlueprint = () => {
    const { filename, blueprintId, scopeId } = useBlueprintContext();
    const blueprint = useBlueprintSlice(filename, blueprintId);
    const updateSessionUi = useSessionStore((s) => s.updateSessionUi);
    const ejectBlueprint = useModuleStore((s) => s.ejectBlueprint);
    const { log } = useShellStore();

    const isOpen = useSessionStore(
        useCallback(
            (state) => !!state.sessions[filename]?.ui?.[scopeId]?.isEjectOpen,
            [filename, scopeId],
        ),
    );

    const open = useCallback(() => {
        updateSessionUi(filename, scopeId, (ui) => {
            ui.isEjectOpen = true;
        });
    }, [filename, scopeId, updateSessionUi]);

    const close = useCallback(() => {
        updateSessionUi(filename, scopeId, (ui) => {
            ui.isEjectOpen = false;
        });
    }, [filename, scopeId, updateSessionUi]);

    const confirm = useCallback(async () => {
        if (!filename || !blueprintId) return;
        if (!blueprint?._editor) {
            log("info", "Blueprint is already in raw mode.");
            close();
            return;
        }
        try {
            await ejectBlueprint({ filename, blueprintId });
            log("success", "Blueprint ejected to raw mode.");
            close();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            log("error", `Failed to eject: ${msg}`);
        }
    }, [filename, blueprintId, blueprint, ejectBlueprint, log, close]);

    return {
        isOpen,
        open,
        close,
        confirm,
        canEject: !!blueprint?._editor,
    };
};

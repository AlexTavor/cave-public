import { useCallback, useRef, type RefObject } from "react";
import type { Runtime } from "../../../engine/runtime/Runtime";
import { useShellStore } from "../shell/shell";
import { useRuntimeStore } from "../../runtime/state/useRuntimeStore";
import { toModuleCartridge } from "../../../engine/terminal/commands/projectCartridgeAdapter";
import { workspaceService } from "../../../engine/terminal/commands/projectServices";
import { harvestPositions } from "./persistence/layoutPersistence";
import { persistProjectLayout } from "./persistence/persistProjectLayout";
import { useLayoutEditorRuntime } from "./useLayoutEditorRuntime";
import { useLayoutEditorTicker } from "./useLayoutEditorTicker";

export interface LayoutEditorController {
    runtime: Runtime | null;
    isReady: boolean;
    isLoading: boolean;
    canvasRef: RefObject<HTMLDivElement | null>;
    handleConfirm: () => void;
    handleCancel: () => void;
}

export const useLayoutEditorController = (
    manifestPath: string,
): LayoutEditorController => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const loadCartridge = useRuntimeStore((s) => s.loadCartridge);
    const log = useShellStore((s) => s.log);
    const toggleLayoutMode = useShellStore((s) => s.toggleLayoutMode);

    const { runtime, isLoading } = useLayoutEditorRuntime({
        manifestPath,
        log,
    });

    useLayoutEditorTicker(runtime);

    const handleConfirm = useCallback(() => {
        const persistLayout = async () => {
            if (!runtime) return;

            const updates = harvestPositions(runtime);

            try {
                await persistProjectLayout(manifestPath, updates);
                const linked = workspaceService.activeCartridge;
                if (linked) loadCartridge(toModuleCartridge(linked));

                const countSuffix = updates.length === 1 ? "" : "s";
                const successMessage =
                    updates.length === 0
                        ? "Saved layout without position changes."
                        : `Saved ${updates.length} layout update${countSuffix}.`;

                log("success", successMessage);
                toggleLayoutMode(false);
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : String(error);
                log("error", `Failed to save layout: ${message}`);
            }
        };

        void persistLayout();
    }, [loadCartridge, log, manifestPath, runtime, toggleLayoutMode]);

    const handleCancel = useCallback(() => {
        toggleLayoutMode(false);
    }, [toggleLayoutMode]);

    const isReady = Boolean(runtime);

    return {
        runtime,
        isReady,
        isLoading,
        canvasRef,
        handleConfirm,
        handleCancel,
    };
};


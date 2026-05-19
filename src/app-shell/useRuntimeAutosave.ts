import { useEffect } from "react";
import { useShellStore } from "../ui/devtools/shell/shell";
import { useRuntimeStore } from "../ui/runtime/state/useRuntimeStore";
import { useAppShellStore } from "./useAppShellStore";

const canAutosave = () => {
    const shell = useAppShellStore.getState();
    const runtime = useRuntimeStore.getState();
    return (
        shell.hasActiveGameSession &&
        shell.surface === "game" &&
        shell.overlay === "none" &&
        runtime.runtime !== null &&
        runtime.status === "running"
    );
};

export const useRuntimeAutosave = (): void => {
    useEffect(() => {
        const interval = globalThis.setInterval(() => {
            if (!canAutosave()) return;
            void useRuntimeStore
                .getState()
                .saveGame("autosave")
                .catch((error: unknown) => {
                    console.error(error);
                    useShellStore.getState().log("error", "Autosave failed.");
                });
        }, 5000);
        return () => globalThis.clearInterval(interval);
    }, []);
};

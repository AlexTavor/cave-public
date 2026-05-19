import { useLayoutEditorHydration } from "./useLayoutEditorHydration";

interface LayoutEditorRuntimeDeps {
    manifestPath: string;
    log: (level: "error" | "success" | "info", message: string) => void;
}

export const useLayoutEditorRuntime = ({
    manifestPath,
    log,
}: LayoutEditorRuntimeDeps) => {
    return useLayoutEditorHydration({ manifestPath, log });
};


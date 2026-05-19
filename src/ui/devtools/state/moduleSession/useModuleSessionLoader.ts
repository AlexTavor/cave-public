import { useCallback } from "react";
import { useSessionStore } from "../useSessionStore";
import { useModuleStore } from "../moduleStore";
import { ensureModuleSessionOnce } from "./sessionInit";
import { isModuleSessionFilename } from "./isModuleSessionFilename";

export const useModuleSessionLoader = () => {
    const initSession = useSessionStore((s) => s.initSession);
    const loadModule = useModuleStore((s) => s.loadModule);
    const getModule = useModuleStore((s) => s.getModule);

    return useCallback(
        async (filename: string | null | undefined) => {
            if (!isModuleSessionFilename(filename)) return;
            const safeFilename = filename;
            await ensureModuleSessionOnce(safeFilename, {
                hasSession: () =>
                    Boolean(useSessionStore.getState().sessions[safeFilename]),
                loadModule,
                getModule,
                initSession,
            });
        },
        [initSession, loadModule, getModule],
    );
};

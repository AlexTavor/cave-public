import { useEffect, useState } from "react";
import { useSessionStore } from "../useSessionStore";
import { useModuleStore } from "../moduleStore";
import { ensureModuleSessionOnce } from "./sessionInit";
import { isModuleSessionFilename } from "./isModuleSessionFilename";

export const useEnsureModuleSession = (filename: string | null) => {
    const eligibleFilename = isModuleSessionFilename(filename)
        ? filename
        : null;
    const session = useSessionStore((state) =>
        eligibleFilename ? state.sessions[eligibleFilename] : undefined,
    );
    const initSession = useSessionStore((s) => s.initSession);
    const loadModule = useModuleStore((s) => s.loadModule);
    const getModule = useModuleStore((s) => s.getModule);
    const [isInitializing, setIsInitializing] = useState(() =>
        Boolean(eligibleFilename && !session),
    );

    useEffect(() => {
        if (!eligibleFilename || session) {
            setIsInitializing(false);
            return;
        }
        let mounted = true;
        const run = async () => {
            setIsInitializing(true);
            await ensureModuleSessionOnce(eligibleFilename, {
                hasSession: () =>
                    Boolean(
                        useSessionStore.getState().sessions[eligibleFilename],
                    ),
                loadModule,
                getModule,
                initSession,
            });
            if (mounted) setIsInitializing(false);
        };
        void run();
        return () => {
            mounted = false;
        };
    }, [eligibleFilename, session, initSession, loadModule, getModule]);

    return { isReady: Boolean(session), isInitializing };
};


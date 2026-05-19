import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
    selectRunStartCycleBanner,
    useRunStartCycleBannerStore,
    type RunStartCycleBannerEvent,
} from "./runStartCycleBannerStore";
import {
    RunStartCycleBannerAnchor,
    RunStartCycleBannerText,
} from "./RunStartCycleBanner.styles";

const ENTER_MS = 400;
const HOLD_MS = 5000;
const EXIT_MS = 400;

export const RuntimeRunStartCycleBanner = () => {
    const banner = useRunStartCycleBannerStore(selectRunStartCycleBanner);
    const [activeBanner, setActiveBanner] =
        useState<RunStartCycleBannerEvent | null>(null);
    const [isExiting, setIsExiting] = useState(false);
    const exitTimerRef = useRef<ReturnType<typeof globalThis.setTimeout>>(null);
    const clearTimerRef =
        useRef<ReturnType<typeof globalThis.setTimeout>>(null);

    useEffect(() => {
        const clearTimers = () => {
            if (exitTimerRef.current)
                globalThis.clearTimeout(exitTimerRef.current);
            if (clearTimerRef.current)
                globalThis.clearTimeout(clearTimerRef.current);
            exitTimerRef.current = null;
            clearTimerRef.current = null;
        };
        if (!banner) {
            clearTimers();
            setIsExiting(false);
            setActiveBanner(null);
            return clearTimers;
        }
        clearTimers();
        setActiveBanner(banner);
        setIsExiting(false);
        exitTimerRef.current = globalThis.setTimeout(
            () => setIsExiting(true),
            ENTER_MS + HOLD_MS,
        );
        clearTimerRef.current = globalThis.setTimeout(
            () => setActiveBanner(null),
            ENTER_MS + HOLD_MS + EXIT_MS,
        );
        return clearTimers;
    }, [banner]);

    return (
        <AnimatePresence initial={false}>
            {activeBanner ? (
                <RunStartCycleBannerAnchor>
                    <RunStartCycleBannerText
                        key={activeBanner.revision}
                        initial={{ opacity: 0, y: -24 }}
                        animate={
                            isExiting
                                ? { opacity: 0, y: -16 }
                                : { opacity: 1, y: 0 }
                        }
                        transition={{ duration: 0.4 }}
                    >
                        {`Wakefulness Cycle ${activeBanner.runNumber}`}
                    </RunStartCycleBannerText>
                </RunStartCycleBannerAnchor>
            ) : null}
        </AnimatePresence>
    );
};

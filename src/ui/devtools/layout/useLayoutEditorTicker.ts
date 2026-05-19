import { useEffect } from "react";
import type { Runtime } from "../../../engine/runtime/Runtime";
import { Ticker } from "../../../engine/runtime/Ticker";

export const useLayoutEditorTicker = (runtime: Runtime | null): void => {
    useEffect(() => {
        if (!runtime) return;

        const ticker = new Ticker();
        ticker.setCallback((dt) => {
            runtime.tick(dt);
        });
        ticker.start();

        return () => {
            ticker.stop();
        };
    }, [runtime]);
};

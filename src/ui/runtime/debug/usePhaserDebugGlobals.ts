import { useEffect, useState } from "react";
import {
    readPhaserDebugGlobals,
    type PhaserDebugGlobals,
} from "./readPhaserDebugGlobals";

const withSnapshotRate = (
    next: PhaserDebugGlobals,
    prev: PhaserDebugGlobals | null,
    dtMs: number,
): PhaserDebugGlobals => ({
    ...next,
    snapshotRate:
        !prev || dtMs <= 0
            ? "0"
            : (
                  ((next.snapshotTotal - prev.snapshotTotal) * 1000) /
                  dtMs
              ).toFixed(0),
});

const POLL_MS = 500;

export const usePhaserDebugGlobals = (enabled: boolean): PhaserDebugGlobals => {
    const [globals, setGlobals] = useState<PhaserDebugGlobals>(() => ({
        ...readPhaserDebugGlobals(),
        snapshotRate: "0",
    }));

    useEffect(() => {
        if (!enabled) {
            setGlobals({ ...readPhaserDebugGlobals(), snapshotRate: "0" });
            return;
        }
        let previous = readPhaserDebugGlobals();
        let lastReadAt = performance.now();
        const timer = globalThis.setInterval(() => {
            const now = performance.now();
            const next = readPhaserDebugGlobals();
            setGlobals(withSnapshotRate(next, previous, now - lastReadAt));
            previous = next;
            lastReadAt = now;
        }, POLL_MS);
        return () => globalThis.clearInterval(timer);
    }, [enabled]);

    return globals;
};

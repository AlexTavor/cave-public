import { useEffect, useState } from "react";
import {
    getCaveDebugApi,
    type PhaserSceneDebugSnapshot,
} from "../../../engine/phaser/debug/phaserDebugStats";

const POLL_MS = 500;

const readSnapshots = (): PhaserSceneDebugSnapshot[] =>
    getCaveDebugApi()?.getSceneSnapshots() ?? [];

export const usePhaserDebugSnapshots = (
    enabled: boolean,
): PhaserSceneDebugSnapshot[] => {
    const [snapshots, setSnapshots] =
        useState<PhaserSceneDebugSnapshot[]>(readSnapshots);

    useEffect(() => {
        if (!enabled) {
            setSnapshots([]);
            return;
        }
        const timer = globalThis.setInterval(() => {
            setSnapshots(readSnapshots());
        }, POLL_MS);

        return () => globalThis.clearInterval(timer);
    }, [enabled]);

    return snapshots;
};

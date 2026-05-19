import {
    getPhaserDebugEnabled,
    registerPhaserDebugResetter,
} from "../../phaser/debug/phaserDebugToggle";

export type SnapshotAllocationSource = "runtime-create" | "tick-phase";

export interface RuntimeAllocationStats {
    totalSnapshots: number;
    bySource: Record<SnapshotAllocationSource, number>;
}

const stats: RuntimeAllocationStats = {
    totalSnapshots: 0,
    bySource: {
        "runtime-create": 0,
        "tick-phase": 0,
    },
};

const resetRuntimeAllocationStats = (): void => {
    stats.totalSnapshots = 0;
    stats.bySource["runtime-create"] = 0;
    stats.bySource["tick-phase"] = 0;
};

registerPhaserDebugResetter(resetRuntimeAllocationStats);

export const recordSnapshotAllocation = (
    source: SnapshotAllocationSource,
): void => {
    if (!getPhaserDebugEnabled()) return;
    stats.totalSnapshots += 1;
    stats.bySource[source] += 1;
};

export const readRuntimeAllocationStats = (): RuntimeAllocationStats => ({
    totalSnapshots: stats.totalSnapshots,
    bySource: { ...stats.bySource },
});

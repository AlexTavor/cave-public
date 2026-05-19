import { getActivePhaserGameCount } from "../../../engine/phaser/debug/phaserGameRegistry";
import { getPhaserDebugEnabled } from "../../../engine/phaser/debug/phaserDebugToggle";
import { readRuntimeAllocationStats } from "../../../engine/runtime/debug/runtimeAllocationStats";
import { readRuntimeActivityStats } from "../../../engine/runtime/debug/runtimeActivityStats";

interface MemoryInfo {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
}

const readTopCounter = (bucket: Record<string, number>): string => {
    const [entry] = Object.entries(bucket).sort(
        (left, right) => right[1] - left[1],
    );
    return entry ? `${entry[0]}:${entry[1]}` : "none";
};

const toMb = (value: number): string => (value / (1024 * 1024)).toFixed(0);

const readMemory = () => {
    const memory = (performance as Performance & { memory?: MemoryInfo })
        .memory;
    if (!memory)
        return { heapUsedMb: "n/a", heapTotalMb: "n/a", heapLimitMb: "n/a" };
    return {
        heapUsedMb: toMb(memory.usedJSHeapSize),
        heapTotalMb: toMb(memory.totalJSHeapSize),
        heapLimitMb: toMb(memory.jsHeapSizeLimit),
    };
};

export interface PhaserDebugGlobals {
    activeGameCount: number;
    canvasCount: number;
    snapshotRate: string;
    heapUsedMb: string;
    heapTotalMb: string;
    heapLimitMb: string;
    snapshotTotal: number;
    tickSnapshotTotal: number;
    runtimeSnapshotTotal: number;
    dirtyMarkTotal: number;
    entitySortTotal: number;
    appliedCommandTotal: number;
    emittedCommandTotal: number;
    topAppliedType: string;
    topEmittedType: string;
    topEmittingSystem: string;
}

const EMPTY_GLOBALS: PhaserDebugGlobals = {
    activeGameCount: 0,
    canvasCount: 0,
    snapshotRate: "0",
    heapUsedMb: "n/a",
    heapTotalMb: "n/a",
    heapLimitMb: "n/a",
    snapshotTotal: 0,
    tickSnapshotTotal: 0,
    runtimeSnapshotTotal: 0,
    dirtyMarkTotal: 0,
    entitySortTotal: 0,
    appliedCommandTotal: 0,
    emittedCommandTotal: 0,
    topAppliedType: "none",
    topEmittedType: "none",
    topEmittingSystem: "none",
};

export const readPhaserDebugGlobals = (): PhaserDebugGlobals => {
    if (!getPhaserDebugEnabled()) return EMPTY_GLOBALS;
    const memory = readMemory();
    const allocations = readRuntimeAllocationStats();
    const activity = readRuntimeActivityStats();

    return {
        activeGameCount: getActivePhaserGameCount(),
        canvasCount: document.querySelectorAll("canvas").length,
        snapshotRate: "0",
        heapUsedMb: memory.heapUsedMb,
        heapTotalMb: memory.heapTotalMb,
        heapLimitMb: memory.heapLimitMb,
        snapshotTotal: allocations.totalSnapshots,
        tickSnapshotTotal: allocations.bySource["tick-phase"],
        runtimeSnapshotTotal: allocations.bySource["runtime-create"],
        dirtyMarkTotal: activity.dirtyMarks,
        entitySortTotal: activity.entitySorts,
        appliedCommandTotal: activity.appliedCommands,
        emittedCommandTotal: activity.emittedCommands,
        topAppliedType: readTopCounter(activity.appliedByType),
        topEmittedType: readTopCounter(activity.emittedByType),
        topEmittingSystem: readTopCounter(activity.emittedBySystem),
    };
};

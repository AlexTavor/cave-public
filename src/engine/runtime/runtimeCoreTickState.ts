import type { Snapshot } from "./Snapshot";
import { createRuntimeSystemPhaseBuffers } from "./runtimeSystemPhaseBuffers";

export const createRuntimeCoreTickState = () => ({
    accumulator: 0,
    activeSnapshotBuffer: 0,
    snapshotBuffers: [null, null] as [Snapshot | null, Snapshot | null],
    systemPhaseBuffers: createRuntimeSystemPhaseBuffers(),
});

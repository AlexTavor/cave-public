import type { PhaseContext } from "./runtimePhaseTypes";
import type { Snapshot } from "./Snapshot";
import { refreshSnapshotPhase, snapshotPhase } from "./runtimePhases";

export const updateSnapshotBuffers = (
    context: PhaseContext,
    activeIndex: number,
    buffers: [Snapshot | null, Snapshot | null],
): { snapshot: Snapshot; nextIndex: number } => {
    const nextIndex = activeIndex === 0 ? 1 : 0;
    const snapshot = buffers[nextIndex]
        ? refreshSnapshotPhase(context, buffers[nextIndex])
        : snapshotPhase(context);

    buffers[nextIndex] = snapshot;
    return { snapshot, nextIndex };
};

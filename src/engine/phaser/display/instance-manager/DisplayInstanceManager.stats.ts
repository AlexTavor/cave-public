import type { DisplayInstanceManagerDeps } from "./DisplayInstanceManager.types";
import type { DisplayInstanceManagerStats } from "../../debug/phaserDebugStats";

type InstanceRecord = {
    spec: { display_key: string };
};

export const buildDisplayInstanceManagerStats = (
    activeInstances: number,
    records: Iterable<InstanceRecord>,
    deps: DisplayInstanceManagerDeps,
): DisplayInstanceManagerStats => {
    const activeByDisplayKey = Array.from(records).reduce<
        Record<string, number>
    >((all, record) => {
        all[record.spec.display_key] = (all[record.spec.display_key] ?? 0) + 1;
        return all;
    }, {});

    return {
        activeInstances,
        activeByDisplayKey,
        pools: deps.pools.getStats(),
    };
};

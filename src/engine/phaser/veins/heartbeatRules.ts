import type { Snapshot } from "../../runtime/Snapshot";
import type { VeinConfig } from "../../../data/schemas/assets";
import { JsonLogicAdapter } from "../../logic/JsonLogicAdapter";

const resolveGlobals = (snapshot: Snapshot): Record<string, number> => {
    const globals: Record<string, number> = {};
    const world = snapshot.getEntity("sys_world") as
        | { state?: Record<string, { value?: number }> }
        | undefined;
    const state = world?.state ?? {};
    for (const [key, entry] of Object.entries(state)) {
        if (typeof entry?.value === "number") {
            globals[key] = entry.value;
        }
    }
    return globals;
};

export const resolveHeartbeatPreset = (
    config: VeinConfig,
    snapshot: Snapshot,
    adapter: JsonLogicAdapter,
): string => {
    const { rules, default: fallback } = config.heartbeats;
    let selected = fallback;

    if (!rules?.length) return selected;

    const globals = resolveGlobals(snapshot);
    for (const rule of rules) {
        const result = adapter.evaluate(
            rule.condition,
            { snapshot, globals },
            "tier1_world",
        );
        if (result) {
            selected = rule.preset;
        }
    }

    return selected;
};

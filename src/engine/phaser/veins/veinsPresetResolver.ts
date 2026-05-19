import type { Runtime } from "../../runtime/Runtime";
import type { VeinConfig } from "../../../data/schemas/assets";
import type { JsonLogicAdapter } from "../../logic/JsonLogicAdapter";
import { resolveHeartbeatPreset } from "./heartbeatRules";

export const resolveVeinsPreset = (
    runtime: Runtime,
    config: VeinConfig,
    adapter: JsonLogicAdapter,
    activePreset: string | undefined,
    virtualTimeMs: number,
    lastHeartbeatCheckMs: number,
    intervalMs: number,
): { preset: string | undefined; lastHeartbeatCheckMs: number } => {
    const world = runtime.getEntity("sys_world") as
        | { cave?: { mind?: { pulsePresetKey?: unknown } } }
        | undefined;
    const override = world?.cave?.mind?.pulsePresetKey;
    if (typeof override === "string" && override) {
        return { preset: override, lastHeartbeatCheckMs };
    }
    if (!config.heartbeats.rules?.length) {
        return { preset: config.heartbeats.default, lastHeartbeatCheckMs };
    }
    if (virtualTimeMs - lastHeartbeatCheckMs < intervalMs) {
        return { preset: activePreset, lastHeartbeatCheckMs };
    }
    return {
        preset: resolveHeartbeatPreset(
            config,
            runtime.createSnapshot(),
            adapter,
        ),
        lastHeartbeatCheckMs: virtualTimeMs,
    };
};

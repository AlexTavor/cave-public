import type { DisplayTickContext } from "../../types";
import type { Runtime } from "../../../../runtime/Runtime";

const readRuntime = (scene: DisplayTickContext["scene"]) => {
    const candidate = scene as DisplayTickContext["scene"] & {
        readRuntime?: () => Runtime | null;
    };
    return typeof candidate.readRuntime === "function"
        ? candidate.readRuntime()
        : null;
};

const readAttention = (world: any) => {
    if (world?.habitiAnnouncement?.active) {
        return world.habitiAnnouncement.attention;
    }
    if (world?.tutorial?.active) {
        return world.tutorial.attention;
    }
    return null;
};

export const readVeinsAlpha = (scene: DisplayTickContext["scene"]) => {
    const world = readRuntime(scene)?.getEntity?.("sys_world") as any;
    const attention = readAttention(world);
    return attention?.focusEntityIds?.length ? 0.15 : 0.5;
};

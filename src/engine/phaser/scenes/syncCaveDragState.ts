import { RuntimeCommandType } from "../../runtime/types";
import type { Runtime } from "../../runtime/Runtime";

export const syncCaveDragState = (
    runtime: Runtime | null,
    active: boolean,
    entityId: string,
): void => {
    if (!runtime) return;
    runtime.commands.enqueue({
        type: RuntimeCommandType.UPDATE_STATE,
        payload: {
            entityId: "sys_world",
            key: "cave_drag_active",
            value: active,
        },
    });
    runtime.commands.enqueue({
        type: RuntimeCommandType.UPDATE_STATE,
        payload: {
            entityId: "sys_world",
            key: "cave_drag_entity_id",
            value: active ? entityId : "",
        },
    });
};

import { RuntimeCommandType } from "../../../../engine/runtime/types";
import type { Runtime } from "../../../../engine/runtime/Runtime";

export const readPointerSelectorState = (runtime: Runtime | null) => {
    const pointer = runtime?.getEntity("sys_pointer") as
        | {
              state?: Record<string, { value?: unknown }>;
              assignment?: { assignedIds?: string[] };
          }
        | undefined;
    const targetId = pointer?.state?.pointer_selector_target_id?.value;
    return {
        isOpen: pointer?.state?.pointer_selector_open?.value === true,
        targetId: typeof targetId === "string" ? targetId : "",
        targetKind:
            typeof pointer?.state?.pointer_selector_target_kind?.value ===
            "string"
                ? String(pointer.state?.pointer_selector_target_kind?.value)
                : "none",
        candidateIds: Array.isArray(pointer?.assignment?.assignedIds)
            ? pointer.assignment.assignedIds
            : [],
    };
};

export const closePointerSelector = (runtime: Runtime) => {
    const updates: Array<[string, string | boolean]> = [
        ["pointer_selector_open", false],
        ["pointer_selector_target_id", ""],
        ["pointer_selector_target_kind", "none"],
    ];
    updates.forEach(([key, value]) =>
        runtime.commands.enqueue({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: { entityId: "sys_pointer", key, value, visible: false },
        }),
    );
    if (runtime.getState().status !== "paused") return;
    runtime.flushCommands?.();
    runtime.stepOncePreservingPause?.();
};

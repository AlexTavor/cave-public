import { describe, expect, it } from "vitest";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { addPurgeMilestoneRuntimeEvents } from "./addPurgeMilestoneRuntimeEvents";

describe("addPurgeMilestoneRuntimeEvents", () => {
    it("converts milestone state updates into purge milestone notifications", () => {
        const items = new Map();

        addPurgeMilestoneRuntimeEvents(items, [
            {
                type: RuntimeCommandType.UPDATE_STATE,
                payload: {
                    entityId: "sys_world",
                    key: "purge_milestone_dread",
                    value: 1,
                },
                metadata: { purgeMilestoneMessage: "The darkness grows." },
            },
        ] as any);

        expect([...items.values()]).toEqual([
            {
                kind: "purge_milestone",
                aggregationKey: "purge_milestone:dread",
                count: 1,
                entityLabel: "The darkness grows.",
            },
        ]);
    });
});

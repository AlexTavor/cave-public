import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { evaluateStructuredConditionSet } from "./evaluateStructuredConditionSet";

const snapshot = (entities: Record<string, unknown>[]) =>
    new Snapshot(entities as any, { getBody: () => undefined } as any);

describe("evaluateStructuredConditionSet body in pointer", () => {
    it("checks the sys_pointer assignment list", () => {
        expect(
            evaluateStructuredConditionSet(
                snapshot([
                    { id: "sys_world" },
                    {
                        id: "sys_pointer",
                        assignment: { assignedIds: ["body-1"] },
                    },
                ]),
                [{ kind: "body_in_pointer" }],
            ),
        ).toBe(true);
        expect(
            evaluateStructuredConditionSet(
                snapshot([
                    { id: "sys_world" },
                    { id: "sys_pointer", assignment: { assignedIds: [] } },
                ]),
                [{ kind: "body_in_pointer" }],
            ),
        ).toBe(false);
    });
});

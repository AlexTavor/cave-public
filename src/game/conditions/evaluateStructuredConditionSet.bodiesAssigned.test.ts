import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { evaluateStructuredConditionSet } from "./evaluateStructuredConditionSet";

const snapshot = (entities: Record<string, unknown>[]) =>
    new Snapshot(entities as any, { getBody: () => undefined } as any);

describe("evaluateStructuredConditionSet bodies assigned", () => {
    it("checks the resolved self assignment list", () => {
        expect(
            evaluateStructuredConditionSet(
                snapshot([
                    { id: "sys_world" },
                    { id: "node", assignment: { assignedIds: ["body-1"] } },
                ]),
                [{ kind: "bodies_assigned" }],
                { id: "node" } as any,
            ),
        ).toBe(true);
        expect(
            evaluateStructuredConditionSet(
                snapshot([
                    { id: "sys_world" },
                    { id: "node", assignment: { assignedIds: [] } },
                ]),
                [{ kind: "bodies_assigned" }],
                { id: "node" } as any,
            ),
        ).toBe(false);
    });
});

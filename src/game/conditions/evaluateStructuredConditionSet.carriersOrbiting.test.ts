import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { evaluateStructuredConditionSet } from "./evaluateStructuredConditionSet";

const snapshot = (entities: Record<string, unknown>[]) =>
    new Snapshot(entities as any, { getBody: () => undefined } as any);

describe("evaluateStructuredConditionSet carriers orbiting", () => {
    it("checks for arrived carrier entities orbiting cave", () => {
        expect(
            evaluateStructuredConditionSet(
                snapshot([
                    { id: "sys_world" },
                    {
                        id: "carrier-1",
                        carrier: { commands: [] },
                        state: { carrier_arrived: { value: 1 } },
                    },
                ]),
                [{ kind: "carriers_orbiting" }],
            ),
        ).toBe(true);
        expect(
            evaluateStructuredConditionSet(
                snapshot([
                    { id: "sys_world" },
                    {
                        id: "carrier-1",
                        carrier: { commands: [] },
                        state: { carrier_arrived: { value: 0 } },
                    },
                ]),
                [{ kind: "carriers_orbiting" }],
            ),
        ).toBe(false);
    });
});

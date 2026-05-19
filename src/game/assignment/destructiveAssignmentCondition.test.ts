import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { evaluateDestructiveAssignmentHasAllBodies } from "./destructiveAssignmentCondition";

const makeSnapshot = (entities: any[]) =>
    new Snapshot(entities, { getBody: () => undefined } as any, {});

const makeNode = (assignedIds: string[], destroys = true) => ({
    id: "node",
    assignment: { assignedIds },
    state: { processing_destroys_assigned_bodies: { value: destroys } },
});

describe("evaluateDestructiveAssignmentHasAllBodies", () => {
    it("returns false for missing or non-destructive self", () => {
        expect(
            evaluateDestructiveAssignmentHasAllBodies(makeSnapshot([]), "node"),
        ).toBe(false);
        expect(
            evaluateDestructiveAssignmentHasAllBodies(
                makeSnapshot([
                    makeNode(["body-1"], false),
                    { id: "body-1", body: {} },
                ]),
                "node",
            ),
        ).toBe(false);
    });

    it("returns false when no extant bodies are assigned or some remain elsewhere", () => {
        expect(
            evaluateDestructiveAssignmentHasAllBodies(
                makeSnapshot([makeNode([])]),
                "node",
            ),
        ).toBe(false);
        expect(
            evaluateDestructiveAssignmentHasAllBodies(
                makeSnapshot([
                    makeNode(["body-1"]),
                    { id: "body-1", body: {} },
                    { id: "body-2", body: {} },
                ]),
                "node",
            ),
        ).toBe(false);
    });

    it("returns true only when self holds every extant non-aggregate body", () => {
        const snapshot = makeSnapshot([
            makeNode(["body-1", "body-2"]),
            { id: "body-1", body: {} },
            { id: "body-2", body: {} },
            { id: "aggregate", body: {}, tags: ["aggregate"] },
        ]);

        expect(
            evaluateDestructiveAssignmentHasAllBodies(snapshot, "node"),
        ).toBe(true);
    });
});

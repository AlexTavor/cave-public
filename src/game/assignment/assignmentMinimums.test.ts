import { describe, expect, it } from "vitest";
import {
    buildAssignmentMinimumProgress,
    satisfiesAssignmentMinimums,
} from "./assignmentMinimums";

const entities: Record<string, any> = {
    body1: {
        id: "body1",
        body: { level: 2, attributes: { body: 3, mind: 1, social: 0 } },
    },
    body2: {
        id: "body2",
        body: { level: 1, attributes: { body: 0, mind: 2, social: 2 } },
    },
};

const getEntity = (id: string) => entities[id];

describe("assignmentMinimums", () => {
    it("builds body-count progress from assigned bodies", () => {
        expect(
            buildAssignmentMinimumProgress(
                getEntity,
                ["body1"],
                [{ kind: "body_count", required: 2 }],
            ),
        ).toEqual([
            {
                label: "Assigned bodies",
                current: 1,
                required: 2,
                satisfied: false,
            },
        ]);
    });

    it("requires every minimum row to be satisfied", () => {
        expect(
            satisfiesAssignmentMinimums(
                getEntity,
                ["body1", "body2"],
                [
                    { kind: "body_count", required: 2 },
                    { kind: "level_total", required: 3 },
                ],
            ),
        ).toBe(true);
        expect(
            satisfiesAssignmentMinimums(
                getEntity,
                ["body1"],
                [{ kind: "body_count", required: 2 }],
            ),
        ).toBe(false);
    });
});

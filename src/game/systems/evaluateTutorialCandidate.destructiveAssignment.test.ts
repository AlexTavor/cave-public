import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { evaluateTutorialCandidate } from "./evaluateTutorialCandidate";

const makeSnapshot = () =>
    new Snapshot(
        [
            { id: "sys_world", permanent: {} },
            {
                id: "absorption",
                tags: ["absorption"],
                assignment: { assignedIds: ["body-1", "body-2"] },
                state: { processing_destroys_assigned_bodies: { value: true } },
            },
            { id: "body-1", body: {} },
            { id: "body-2", body: {} },
        ],
        { getBody: () => undefined } as any,
        {},
    );

const guidanceIndex = new Map([
    [
        "modal",
        {
            id: "modal",
            presentation: "modal",
            title: "",
            text: "",
            attention: [],
            imageUrl: null,
        },
    ],
]) as any;

const conditionIndex = new Map([
    [
        "last_body",
        {
            id: "last_body",
            label: "Last Body",
            selfDefinition: { kind: "entity_tag", tag: "absorption" },
            conditions: [{ kind: "destructive_assignment_has_all_bodies" }],
        },
    ],
]) as any;

describe("evaluateTutorialCandidate destructive assignment", () => {
    it("skips modal-only tutorials that leave self on auto", () => {
        expect(
            evaluateTutorialCandidate(
                makeSnapshot(),
                {
                    id: "last_body",
                    selfDefinition: { kind: "auto" },
                    enterConditionIds: ["last_body"],
                    guidances: [{ guidanceId: "modal" }],
                    exitConditionIds: [],
                    onComplete: [],
                } as any,
                guidanceIndex,
                conditionIndex,
            ),
        ).toMatchObject({ kind: "skip" });
    });

    it("activates when tutorial self explicitly targets absorption", () => {
        expect(
            evaluateTutorialCandidate(
                makeSnapshot(),
                {
                    id: "last_body",
                    selfDefinition: { kind: "entity_tag", tag: "absorption" },
                    enterConditionIds: ["last_body"],
                    guidances: [{ guidanceId: "modal" }],
                    exitConditionIds: [],
                    onComplete: [],
                } as any,
                guidanceIndex,
                conditionIndex,
            ),
        ).toMatchObject({
            kind: "eligible",
            state: { tutorialId: "last_body", selfId: "absorption" },
        });
    });
});

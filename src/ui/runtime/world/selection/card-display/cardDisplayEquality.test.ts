import { describe, expect, it } from "vitest";
import type { SelectionCardModel } from "./cardDisplayTypes";
import { selectionCardModelEqual } from "./cardDisplayEquality";

const makeModel = (): SelectionCardModel => ({
    id: "resource:pool-1",
    entityId: "pool-1",
    title: { id: "pool-1:title", text: "Food Pool" },
    sections: [
        {
            id: "pool-1:storage",
            layout: "column" as const,
            density: "normal" as const,
            capsules: [
                {
                    id: "food",
                    skin: "value" as const,
                    title: "Food",
                    value: {
                        binding: {
                            id: "food:text",
                            entityId: "pool-1",
                            kind: "compact-fraction" as const,
                            valuePath: "state.food.value",
                            maxPath: "state.food.max",
                        },
                    },
                    effects: [],
                },
            ],
        },
    ],
});

describe("selectionCardModelEqual", () => {
    it("treats unchanged live bindings as equal", () => {
        // Given / When / Then
        expect(selectionCardModelEqual(makeModel(), makeModel())).toBe(true);
    });

    it("detects static title changes", () => {
        // Given
        const left = makeModel();
        const right = {
            ...makeModel(),
            title: { id: "pool-1:title", text: "Wood Pool" },
        };

        // When / Then
        expect(selectionCardModelEqual(left, right)).toBe(false);
    });

    it("detects action callback and binding changes", () => {
        // Given
        const left = makeModel();
        const right = JSON.parse(JSON.stringify(makeModel()));
        left.title = {
            id: "pool-1:title",
            text: "Food Pool",
            action: {
                id: "open",
                label: "Open",
                kind: "callback",
                callback: () => undefined,
            },
        };
        right.title = {
            ...left.title,
            action: { ...left.title.action, callback: () => undefined },
        };

        // When / Then
        expect(selectionCardModelEqual(left, right)).toBe(false);
        right.title = left.title;
        right.sections[0].capsules![0].value!.binding!.valuePath =
            "state.other.value";
        expect(selectionCardModelEqual(left, right)).toBe(false);
    });

    it("detects progress binding changes", () => {
        // Given
        const left = makeModel();
        const right = JSON.parse(JSON.stringify(makeModel()));
        const leftCapsule = left.sections[0].capsules?.[0];
        const rightCapsule = right.sections[0].capsules?.[0];
        if (!leftCapsule || !rightCapsule) throw new Error("Missing capsule");
        leftCapsule.progress = {
            id: "food:bar",
            entityId: "pool-1",
            valuePath: "state.food.value",
            maxPath: "state.food.max",
        };
        rightCapsule.progress = {
            ...leftCapsule.progress,
            maxPath: "state.other.max",
        };

        // When / Then
        expect(selectionCardModelEqual(left, right)).toBe(false);
    });
});

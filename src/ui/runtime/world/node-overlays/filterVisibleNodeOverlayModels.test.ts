import { describe, expect, it } from "vitest";
import { filterVisibleNodeOverlayModels } from "./filterVisibleNodeOverlayModels";

describe("filterVisibleNodeOverlayModels", () => {
    it("keeps filtering semantic when cycle and storage values are live", () => {
        expect(
            filterVisibleNodeOverlayModels([
                {
                    entityId: "e",
                    kind: "storage",
                    label: "Food",
                    valueBinding: {
                        id: "text:e",
                        entityId: "e",
                        kind: "compact-fraction",
                        valuePath: "state.food",
                        maxValue: 3,
                    },
                },
                {
                    entityId: "a",
                    kind: "assignment",
                    label: "Idle",
                    valueText: "",
                },
                {
                    entityId: "e",
                    kind: "storage",
                    label: "Food",
                    valueBinding: {
                        id: "text:e",
                        entityId: "e",
                        kind: "compact-fraction",
                        valuePath: "state.food",
                        maxValue: 3,
                    },
                },
                {
                    entityId: "b",
                    kind: "cycle",
                    label: "Next cycle",
                    valueText: "No power",
                },
                {
                    entityId: "b2",
                    kind: "cycle",
                    label: "Next cycle",
                    valueText: "Idle",
                },
                {
                    entityId: "c",
                    kind: "assignment",
                    label: "Time to completion",
                    valueBinding: {
                        id: "text:c",
                        entityId: "c",
                        kind: "remaining-duration-ms",
                        valuePath: "state.progress",
                        maxPath: "state.duration",
                    },
                },
                {
                    entityId: "d",
                    kind: "cycle",
                    label: "Next cycle",
                    valueBinding: {
                        id: "text:d",
                        entityId: "d",
                        kind: "cycle-countdown",
                    },
                },
            ] as any),
        ).toEqual([
            {
                entityId: "e",
                kind: "storage",
                label: "Food",
                valueBinding: {
                    id: "text:e",
                    entityId: "e",
                    kind: "compact-fraction",
                    valuePath: "state.food",
                    maxValue: 3,
                },
            },
            {
                entityId: "e",
                kind: "storage",
                label: "Food",
                valueBinding: {
                    id: "text:e",
                    entityId: "e",
                    kind: "compact-fraction",
                    valuePath: "state.food",
                    maxValue: 3,
                },
            },
            {
                entityId: "c",
                kind: "assignment",
                label: "Time to completion",
                valueBinding: {
                    id: "text:c",
                    entityId: "c",
                    kind: "remaining-duration-ms",
                    valuePath: "state.progress",
                    maxPath: "state.duration",
                },
            },
            {
                entityId: "d",
                kind: "cycle",
                label: "Next cycle",
                valueBinding: {
                    id: "text:d",
                    entityId: "d",
                    kind: "cycle-countdown",
                },
            },
        ]);
    });
});

import { describe, it, expect } from "vitest";
import type { EditorConfig } from "../../../data/schemas/abilities";
import { collisionDetector } from "./collisionDetector";

const makeStorage = (resource: string) => ({
    resource,
    capacity: { base: 0, perBody: 0, multPerBody: 0 },
    isDefault: true,
    entropy: { base: 0, perBody: 0, multPerBody: 0 },
    visible: true,
    barPosition: "top_left" as const,
    allowDeposit: true,
    allowWithdraw: true,
    priority: 0,
});

const makeUpkeep = (resource: string) => ({
    resource,
    rate: { base: 1, perBody: 0, multPerBody: 0 },
    failureTrait: "is_starving",
    autoRequest: true,
});

describe("collisionDetector", () => {
    it("flags malformed storage entries that will be removed", () => {
        const editor: EditorConfig = {
            abilities: {
                storage: [makeStorage("")],
            },
        };

        const issues = collisionDetector(editor);
        expect(issues.some((i) => i.id === "storage_invalid_0")).toBe(true);
    });
    it("flags duplicate resource entries", () => {
        const editor: EditorConfig = {
            abilities: {
                storage: [makeStorage("wood"), makeStorage("wood")],
            },
        };

        const issues = collisionDetector(editor);
        expect(issues.some((i) => i.id === "storage_duplicate_wood")).toBe(
            true,
        );
    });

    it("warns when upkeep lacks matching storage", () => {
        const editor: EditorConfig = {
            abilities: {
                storage: [makeStorage("food")],
                upkeep: [makeUpkeep("wood")],
            },
        };

        const issues = collisionDetector(editor);
        expect(issues[0]?.severity).toBe("warning");
    });

    it("flags cycle write collisions with conversion resets", () => {
        const editor: EditorConfig = {
            abilities: {
                cycle: {
                    maxProgress: { base: 10, perBody: 0, multPerBody: 0 },
                    costMultPerCycle: 0,
                    inputs: {},
                    oneOff: false,
                    conditions: [],
                },
                conversion: [
                    {
                        id: "conv",
                        inputs: [],
                        outputs: [],
                        resetCycle: true,
                        conditions: [],
                    },
                ],
            },
        };

        const issues = collisionDetector(editor);
        expect(issues.some((i) => i.id === "cycle_state_collision")).toBe(true);
    });

    it("flags conversion entries with missing resources", () => {
        const editor: EditorConfig = {
            abilities: {
                conversion: [
                    {
                        id: "conv",
                        inputs: [
                            {
                                resource: "",
                                amount: { base: 1, perBody: 0, multPerBody: 0 },
                            },
                        ],
                        outputs: [],
                        resetCycle: true,
                        conditions: [],
                    },
                ],
            },
        };

        const issues = collisionDetector(editor);
        expect(issues.some((i) => i.id === "conversion_invalid_0")).toBe(true);
    });

    it("flags production when cycle is missing", () => {
        const editor: EditorConfig = {
            abilities: {
                production: [
                    {
                        resource: "wood",
                        amount: { base: 1, perBody: 0, multPerBody: 0 },
                        conditions: [],
                    },
                ],
            },
        };

        const issues = collisionDetector(editor);
        expect(issues.some((i) => i.id === "production_requires_cycle")).toBe(
            true,
        );
    });
});


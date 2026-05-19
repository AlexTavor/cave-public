import { describe, expect, it } from "vitest";
import {
    resolveEntityLabel,
    resolveProgressThreshold,
    resolveTransferRule,
} from "./selectionUtils";
import type { RuntimeEntity } from "../../../../engine/runtime/types";

describe("selectionUtils misc", () => {
    it("prefers display label then fallback id", () => {
        const entity = { id: "entity-1", display: { label: "Show" } };
        expect(resolveEntityLabel(entity as RuntimeEntity)).toBe("Show");

        const fallback = { id: "entity-2" } as RuntimeEntity;
        expect(resolveEntityLabel(fallback)).toBe("entity-2");
    });

    it("resolves progress threshold from maxKey state", () => {
        const entity: RuntimeEntity = {
            id: "work-1",
            state: { progress: { value: 10 }, health: { value: 7 } },
            display: {
                bars: [{ key: "progress", maxKey: "state.health" }],
            },
        } as RuntimeEntity;

        expect(resolveProgressThreshold(entity)).toBe(7);
    });

    it("extracts first transfer rule", () => {
        const entity: RuntimeEntity = {
            id: "job-1",
            behavior: {
                rules: [
                    { actions: [{ type: "MOVE" }] },
                    {
                        actions: [
                            { type: "TRANSFER", resource: "food", amount: 2 },
                        ],
                    },
                ],
            },
        } as RuntimeEntity;

        expect(resolveTransferRule(entity)).toEqual({
            resource: "food",
            amount: 2,
        });
    });
});

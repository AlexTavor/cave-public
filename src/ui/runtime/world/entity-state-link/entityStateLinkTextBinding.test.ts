import { describe, expect, it } from "vitest";
import { entityTextBindingEqual } from "./entityStateLinkTextBinding";

const makeBinding = () => ({
    id: "e1:text",
    entityId: "e1",
    kind: "numeric-text" as const,
    valuePath: "state.hp.value",
    format: "compact-number" as const,
});

describe("entityTextBindingEqual", () => {
    it("detects numeric-text field changes", () => {
        const base = makeBinding();
        expect(entityTextBindingEqual(base, makeBinding())).toBe(true);
        expect(
            entityTextBindingEqual(base, {
                ...base,
                valuePath: "state.mp.value",
            }),
        ).toBe(false);
        expect(
            entityTextBindingEqual(base, { ...base, format: "raw-number" }),
        ).toBe(false);
        expect(entityTextBindingEqual(base, { ...base, multiplier: 100 })).toBe(
            false,
        );
        expect(entityTextBindingEqual(base, { ...base, suffix: "%" })).toBe(
            false,
        );
        expect(
            entityTextBindingEqual(base, { ...base, fallbackText: "?" }),
        ).toBe(false);
    });
});

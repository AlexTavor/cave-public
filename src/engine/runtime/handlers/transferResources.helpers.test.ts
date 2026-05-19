import { describe, expect, it, vi } from "vitest";
import type { RuntimeEntity } from "../types";
import { debitResources, hasSufficientResources } from "./transferUtils";

const makeLog = () => vi.fn();

describe("transfer resource helpers", () => {
    it("logs explicit failures for invalid or insufficient source state", () => {
        const missingLog = makeLog();
        expect(hasSufficientResources({ id: "a" }, { wood: 1 }, missingLog)).toBe(false);
        expect(missingLog).toHaveBeenCalledWith("errors", expect.stringContaining("has no state"));

        const invalidAmountLog = makeLog();
        expect(hasSufficientResources({ id: "a", state: { wood: { value: 2 } } }, { wood: 0 }, invalidAmountLog)).toBe(false);
        expect(invalidAmountLog).toHaveBeenCalledWith("errors", expect.stringContaining("invalid amount"));

        const missingValueLog = makeLog();
        expect(hasSufficientResources({ id: "a", state: { wood: { value: "nope" } } }, { wood: 1 }, missingValueLog)).toBe(false);
        expect(missingValueLog).toHaveBeenCalledWith("errors", expect.stringContaining("missing numeric value"));

        const insufficientLog = makeLog();
        expect(hasSufficientResources({ id: "a", state: { wood: { value: 1 } } }, { wood: 3 }, insufficientLog)).toBe(false);
        expect(insufficientLog).toHaveBeenCalledWith("errors", expect.stringContaining("insufficient"));
    });

    it("returns true when resources are sufficient and debits matching keys", () => {
        const entity: RuntimeEntity = { id: "a", state: { wood: { value: 5 }, stone: { value: 2 } } };
        expect(hasSufficientResources(entity, { wood: 2 }, makeLog())).toBe(true);
        debitResources(entity, { wood: 2, missing: 1 });
        expect((entity.state as any).wood.value).toBe(3);
        expect((entity.state as any).stone.value).toBe(2);
    });
});
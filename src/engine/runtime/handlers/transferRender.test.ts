import { describe, expect, it } from "vitest";
import { buildPayloadLabel, resolveTransferVisualType } from "./transferRender";

describe("transferRender", () => {
    it("uses the first payload key as visualType", () => {
        expect(resolveTransferVisualType({ wood: 1, heat: 2 })).toBe("wood");
    });

    it("returns null for empty payloads", () => {
        expect(resolveTransferVisualType({})).toBeNull();
    });

    it("builds deterministic labels from payload entries", () => {
        expect(buildPayloadLabel({ wood: 2, heat: 1 })).toBe("2 wood, 1 heat");
    });
});

import { describe, expect, it } from "vitest";
import { formatRuntimeEventText } from "./formatRuntimeNotificationText";

describe("formatRuntimeNotificationText unlock", () => {
    it("formats unlocked aggregation like discovery with unlocked wording", () => {
        expect(
            formatRuntimeEventText({
                id: "1",
                kind: "entity_unlocked",
                aggregationKey: "entity_unlocked:ore",
                count: 2,
                entityLabel: "Ore",
                updatedAtMs: 0,
                expiresAtMs: 1,
            } as any).text,
        ).toBe("Ore unlocked (x2)");
    });
});

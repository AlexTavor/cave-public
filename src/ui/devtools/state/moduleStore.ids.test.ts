import { describe, expect, it } from "vitest";
import { generateEntityId } from "./moduleStore.ids";

describe("ui/devtools/state/moduleStore.ids", () => {
    it("generates entity_ ids based on time", () => {
        expect(generateEntityId(() => 0)).toBe("entity_0");
        expect(generateEntityId(() => 35)).toBe("entity_z");
    });
});

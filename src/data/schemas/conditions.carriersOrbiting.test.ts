import { describe, expect, it } from "vitest";
import { StructuredConditionSchema } from "./conditions";

describe("ConditionsSchema carriers orbiting", () => {
    it("parses carriers_orbiting conditions without authored fields", () => {
        expect(
            StructuredConditionSchema.parse({ kind: "carriers_orbiting" }),
        ).toMatchObject({ kind: "carriers_orbiting" });
    });
});

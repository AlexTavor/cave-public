import { describe, expect, it } from "vitest";
import { StructuredConditionSchema } from "./conditions";

describe("ConditionsSchema bodies assigned", () => {
    it("parses bodies_assigned conditions without authored fields", () => {
        expect(
            StructuredConditionSchema.parse({ kind: "bodies_assigned" }),
        ).toMatchObject({ kind: "bodies_assigned" });
    });
});

import { describe, expect, it } from "vitest";
import { StructuredConditionSchema } from "./conditions";

describe("ConditionsSchema body in pointer", () => {
    it("parses body_in_pointer conditions without authored fields", () => {
        expect(
            StructuredConditionSchema.parse({ kind: "body_in_pointer" }),
        ).toMatchObject({ kind: "body_in_pointer" });
    });
});

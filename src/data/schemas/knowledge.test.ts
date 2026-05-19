import { describe, expect, it } from "vitest";
import { KnowledgeSchema } from "./knowledge";

describe("KnowledgeSchema", () => {
    it("parses codex wrappers over guidances", () => {
        expect(
            KnowledgeSchema.parse([
                {
                    id: "intro",
                    label: "First Memory",
                    description: "Intro guidance",
                    guidanceId: "intro_modal",
                    unlockConditionIds: ["cond_intro"],
                },
            ]),
        ).toHaveLength(1);
    });

    it("rejects duplicate knowledge ids", () => {
        expect(() =>
            KnowledgeSchema.parse([
                { id: "dup", label: "A", guidanceId: "a" },
                { id: "dup", label: "B", guidanceId: "b" },
            ]),
        ).toThrow(/Duplicate knowledge id/);
    });

    it("parses optional target overrides and rejects legacy fields", () => {
        expect(
            KnowledgeSchema.parse([
                {
                    id: "intro",
                    label: "Intro",
                    description: "Desc",
                    guidanceId: "intro_modal",
                    targetOverride: { kind: "entity_id", entityId: "egg" },
                },
            ])[0]?.targetOverride,
        ).toMatchObject({ kind: "entity_id", entityId: "egg" });
        expect(() =>
            KnowledgeSchema.parse([
                { id: "legacy", label: "A", guidanceId: "g", key: "old" },
            ]),
        ).toThrow();
    });
});

import { describe, expect, it } from "vitest";
import { toCaveModule, toSemanticFragment } from "./semanticModuleFragments";

describe("semanticModuleFragments .cave collections", () => {
    it("preserves guidance tutorial collections in cave modules", () => {
        const moduleData = toCaveModule("modules/core.cave", {
            conditions: [
                {
                    id: "cond_intro",
                    label: "Intro",
                    conditions: [
                        {
                            id: "cond_intro_rule",
                            sortKey: "01COND",
                            kind: "world_state_boolean",
                            key: "seen_intro",
                            value: true,
                        },
                    ],
                },
            ],
            guidances: [
                {
                    id: "intro",
                    presentation: "modal",
                    title: "Intro",
                    text: "Wake up.",
                },
            ],
            tutorials: [
                {
                    id: "intro_tutorial",
                    selfDefinition: { kind: "auto" },
                    guidances: [{ guidanceId: "intro" }],
                },
            ],
            knowledge: [
                {
                    id: "intro_knowledge",
                    label: "Intro",
                    description: "Intro entry",
                    guidanceId: "intro",
                },
            ],
        });

        expect(moduleData.config?.settings?.guidances?.[0]?.id).toBe("intro");
        expect(
            toSemanticFragment("modules/core.cave", moduleData),
        ).toMatchObject({
            conditions: [{ id: "cond_intro" }],
            guidances: [{ id: "intro" }],
            tutorials: [{ id: "intro_tutorial" }],
            knowledge: [{ id: "intro_knowledge" }],
        });
    });
});

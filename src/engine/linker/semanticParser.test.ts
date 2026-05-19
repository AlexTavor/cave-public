import { describe, expect, it } from "vitest";
import { parseSemanticFragment } from "./semanticParser";
import { LinkerValidationError } from "./errors";

describe("parseSemanticFragment", () => {
    it("accepts phase 15 system config keys in .cave", () => {
        const cave = parseSemanticFragment("core.cave", ".cave", {
            impulse: { defaultDtMs: 16 },
            game_config: {},
            conditions: [
                {
                    id: "cond_intro",
                    label: "Intro Seen",
                    conditions: [
                        {
                            id: "cond_intro_rule",
                            sortKey: "01COND",
                            kind: "world_state_boolean",
                            key: "intro_seen",
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
                    id: "throttle",
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
            world: { id: "sys_world" },
            traits: {},
        });

        expect(cave.kind).toBe("cave");
        if (cave.kind !== "cave") return;
        expect(cave.data.guidances?.[0]?.id).toBe("intro");
        expect(cave.data.tutorials?.[0]?.id).toBe("throttle");
        expect(cave.data.carrier).toBeUndefined();
    });

    it("parses supported semantic extensions", () => {
        const cave = parseSemanticFragment("a.cave", ".cave", {
            impulse: { defaultDtMs: 12 },
        });
        const draft = parseSemanticFragment("a.draft", ".draft", {
            draftOptions: {
                one: {
                    id: "one",
                    title: "One",
                    description: "d",
                    icon: "⚪",
                    payload: [],
                },
            },
        });
        const art = parseSemanticFragment("a.art", ".art", {
            displays: { orb: { type: "body" } },
        });
        const bp = parseSemanticFragment("a.bp", ".bp", {
            worker: { label: "Worker" },
        });

        expect(cave.kind).toBe("cave");
        expect(draft.kind).toBe("draft");
        expect(art.kind).toBe("art");
        expect(bp.kind).toBe("bp");
    });

    it("throws for unsupported extension and invalid schema", () => {
        expect(() => parseSemanticFragment("a.txt", ".txt", {})).toThrow(
            LinkerValidationError,
        );
        expect(() =>
            parseSemanticFragment("a.bp", ".bp", { a: { label: 1 } }),
        ).toThrow(LinkerValidationError);
    });
});


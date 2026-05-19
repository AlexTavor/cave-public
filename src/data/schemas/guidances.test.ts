import { describe, expect, it } from "vitest";
import { GuidancesSchema } from "./guidances";

describe("GuidancesSchema", () => {
    it("parses valid node, screen, and modal guidances", () => {
        expect(
            GuidancesSchema.parse([
                {
                    id: "intro_modal",
                    presentation: "modal",
                    title: "Intro",
                    text: "Wake up.",
                },
                {
                    id: "focus_callout",
                    presentation: "node_callout",
                    target: { kind: "entity_tag", tag: "egg" },
                    slot: "top",
                    text: "Select the egg.",
                    attention: ["show_attention_effect_on_self"],
                },
                {
                    id: "screen_hint",
                    presentation: "screen_callout",
                    screenSlot: "top_right",
                    text: "Watch the corner.",
                    attention: ["hide_notifications"],
                },
                {
                    id: "draft_intro",
                    presentation: "draft_guidance",
                    targetOptionId: "opt_alpha",
                },
            ]),
        ).toHaveLength(4);
    });

    it("rejects duplicate guidance ids", () => {
        expect(() =>
            GuidancesSchema.parse([
                { id: "dup", presentation: "modal", text: "A" },
                { id: "dup", presentation: "modal", text: "B" },
            ]),
        ).toThrow(/Duplicate guidance id/);
    });

    it("rejects subtype-invalid extra fields and attention", () => {
        expect(() =>
            GuidancesSchema.parse([
                {
                    id: "screen_hint",
                    presentation: "screen_callout",
                    screenSlot: "top_right",
                    text: "Hint",
                    target: { kind: "entity_id", entityId: "egg" },
                    attention: ["hide_all_but_self"],
                },
            ]),
        ).toThrow();
        expect(() =>
            GuidancesSchema.parse([
                {
                    id: "draft_intro",
                    presentation: "draft_guidance",
                    targetOptionId: "opt_alpha",
                    text: "Nope",
                },
            ]),
        ).toThrow();
        expect(() =>
            GuidancesSchema.parse([
                {
                    id: "draft_intro",
                    presentation: "draft_guidance",
                    targetOptionId: "opt_alpha",
                    attention: ["hide_all_but_self"],
                },
            ]),
        ).toThrow();
    });
});

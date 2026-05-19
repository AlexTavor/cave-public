import { describe, it, expect } from "vitest";
import type { Blueprint } from "../../../data/schemas/blueprint";
import { appendBodyHealthBar } from "./bodyCompilerBar";
import type { DisplayComponentSchema } from "../../../data/schemas/components";
import type { z } from "zod";

type BarArray = z.infer<typeof DisplayComponentSchema>["bars"];

const makeDraft = (bars?: BarArray) =>
    ({
        id: "test",
        label: "test",
        tags: [],
        components: {
            display: { label: "Test", display_key: "test", bars },
        },
    }) as Blueprint;

describe("appendBodyHealthBar", () => {
    it("appends health bar to display.bars", () => {
        const draft = makeDraft();
        appendBodyHealthBar(draft);

        expect(draft.components.display!.bars).toEqual([
            {
                key: "body.health",
                maxKey: "body.maxHealth",
                color: "#4caf50",
                label: "Health",
            },
        ]);
    });

    it("does not duplicate when already present", () => {
        const draft = makeDraft([
            { key: "body.health", maxKey: "body.maxHealth" },
        ]);
        appendBodyHealthBar(draft);

        expect(draft.components.display!.bars).toHaveLength(1);
    });

    it("skips when display is undefined", () => {
        const draft = {
            id: "test",
            label: "test",
            tags: [],
            components: {},
        } as Blueprint;
        appendBodyHealthBar(draft);

        expect(draft.components.display).toBeUndefined();
    });
});

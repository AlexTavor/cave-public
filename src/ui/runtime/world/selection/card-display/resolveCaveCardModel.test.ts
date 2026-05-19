import { describe, expect, it } from "vitest";
import type { CaveCardData } from "../cave/caveCardTypes";
import { resolveCaveCardModel } from "./resolveCaveCardModel";

const makeData = (): CaveCardData => ({
    label: "The Cave",
    targetId: "sys_world",
    level: 2,
    xpMax: 250,
    attributes: { body: 10, mind: 10, social: 10 },
    habiti: [],
    understanding: [],
    modifiers: [
        {
            targetKey: "food",
            valueStr: "+1",
            intervalStr: "/5s",
            sourceId: "feast",
        } as any,
    ],
    traits: [],
});

describe("resolveCaveCardModel", () => {
    it("uses live bindings for cave stats and comfort-scaled bonuses", () => {
        const model = resolveCaveCardModel(makeData());
        const stats = model?.sections[0].capsules ?? [];
        const comfort = model?.sections[1].capsules ?? [];
        const attributes = model?.sections[3].capsules ?? [];
        expect(stats[0]?.value).toEqual(
            expect.objectContaining({
                binding: expect.objectContaining({
                    kind: "compact-fraction",
                    valuePath: "cave.progression.xp",
                    maxValue: 250,
                }),
            }),
        );
        expect(stats[2]?.value).toEqual(
            expect.objectContaining({
                binding: expect.objectContaining({
                    kind: "numeric-text",
                    valuePath: "state.population.value",
                }),
            }),
        );
        expect(comfort[0]?.value).toEqual(
            expect.objectContaining({
                binding: expect.objectContaining({
                    format: "integer-percent",
                    multiplier: 100,
                }),
            }),
        );
        expect(attributes[0]?.value).toEqual(
            expect.objectContaining({
                binding: expect.objectContaining({
                    valuePath: "state.comfort.value",
                    multiplier: 10,
                }),
            }),
        );
        expect(attributes[0]?.effects[0]?.text).toBe("(10)");
    });
});

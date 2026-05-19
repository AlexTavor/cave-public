import { describe, expect, it } from "vitest";
import type { BodyCardData } from "../body/bodyCardTypes";
import { resolveBodyCardModel } from "./resolveBodyCardModel";

const makeData = (): BodyCardData => ({
    subjectId: "body-1",
    isPermanent: true,
    showIdentityTitle: true,
    displayName: "Alden",
    description: "A body.",
    fallbackIconId: "worker",
    level: 2,
    xpMax: 250,
    xpRate: 1,
    baseAttributes: { body: 2, mind: 2, social: 1 },
    attributes: { body: 3, mind: 2, social: 1 },
    modifiers: [
        {
            targetKey: "health",
            valueStr: "+1",
            intervalStr: "/s",
            sourceId: "regen",
            sourceType: "power",
        } as any,
    ],
    traits: [
        {
            traitId: "cold",
            label: "Cold",
            description: "shivers",
            effects: [{ targetKey: "body", valueStr: "-1", intervalStr: "/s" }],
        } as any,
    ],
    habiti: [],
});

describe("resolveBodyCardModel", () => {
    it("uses live bindings for xp and health and anchors attribute modifiers", () => {
        const model = resolveBodyCardModel(makeData());
        const stats = model?.sections[0].capsules ?? [];
        const attributes = model?.sections[2].capsules ?? [];
        expect(stats[0]?.value).toEqual({
            binding: {
                id: "body-1:xp",
                entityId: "body-1",
                kind: "compact-fraction",
                valuePath: "body.xp",
                maxValue: 250,
            },
        });
        expect(stats[0]?.effects[0]?.text).toBe("+1/s");
        expect(stats[2]?.value).toEqual({
            binding: {
                id: "body-1:health",
                entityId: "body-1",
                kind: "compact-fraction",
                valuePath: "body.health",
                maxPath: "body.maxHealth",
            },
        });
        const healthBinding = stats[2]?.value?.binding;
        expect(healthBinding && "maxPath" in healthBinding ? healthBinding.maxPath : undefined).toBe("body.maxHealth");
        expect(attributes[0]?.effects.map((effect) => effect.text)).toEqual([
            "(+1)",
            "-1/s",
        ]);
        expect(
            model?.sections.find((section) => section.title === "Effects"),
        ).toBeUndefined();
    });
});

import { describe, expect, it } from "vitest";
import { resolveBestDropBodyId } from "./pointerDropChoice";

const makeBody = (
    id: string,
    xp: number,
    traits: string[] = [],
    habiti: string[] = [],
) => ({
    id,
    body: { xp, traits, habiti, attributes: { body: xp, mind: 0, social: 0 } },
});

describe("resolveBestDropBodyId", () => {
    it("ignores carried bodies that fail the target assignment filter", () => {
        const chosen = resolveBestDropBodyId({
            target: {
                id: "node",
                assignment: {
                    assignedIds: [],
                    filter: [{ kind: "required_traits_all", ids: ["swift"] }],
                },
            } as any,
            carriedBodies: [
                makeBody("invalid", 1),
                makeBody("valid", 2, ["swift"]) as any,
            ],
            knownHabiti: [],
        });
        expect(chosen).toBe("valid");
    });

    it("returns null when the target has no remaining assignment slots", () => {
        expect(
            resolveBestDropBodyId({
                target: {
                    id: "node",
                    assignment: { slots: 1, assignedIds: ["held"] },
                } as any,
                carriedBodies: [makeBody("body-1", 1) as any],
                knownHabiti: [],
            }),
        ).toBeNull();
    });

    it("keeps butcher ordering after validity filtering", () => {
        const chosen = resolveBestDropBodyId({
            target: {
                id: "butcher",
                tags: ["cave_butcher"],
                assignment: {
                    assignedIds: [],
                    filter: [{ kind: "required_traits_all", ids: ["usable"] }],
                },
            } as any,
            carriedBodies: [
                makeBody("blocked", 0) as any,
                makeBody("low-xp", 1, ["usable"], ["known"]) as any,
                makeBody("high-xp", 5, ["usable"], ["known"]) as any,
            ],
            knownHabiti: ["known"],
        });
        expect(chosen).toBe("low-xp");
    });
});

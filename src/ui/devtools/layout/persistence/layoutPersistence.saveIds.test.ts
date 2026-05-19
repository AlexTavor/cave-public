import { describe, expect, it } from "vitest";
import { resolveAuthoredWorldPosition } from "../../../../data/schemas/v2/worldPositionDefaults";
import {
    createCartridge,
    createBlueprint,
} from "../../../../engine/test/factories";
import { applyLayoutBatch, harvestPositions } from "./layoutPersistence";

describe("layoutPersistence save ids", () => {
    it("harvests finite body positions without requiring compiled world presence", () => {
        const updates = harvestPositions({
            getEntities: () => [{ id: "module::hero" }, { id: "sys_world" }],
            getPhysicsBody: (id: string) =>
                id === "module::hero"
                    ? { position: resolveAuthoredWorldPosition(4, 8) }
                    : undefined,
        } as any);

        expect(updates).toEqual([{ blueprintId: "module::hero", x: 4, y: 8 }]);
    });

    it("applies updates by resolved runtime blueprint id", () => {
        const draft = createCartridge("game.json", {
            blueprints: {
                hero: createBlueprint("hero", {
                    _editor: {
                        abilities: {
                            worldPresence: {
                                x: 1,
                                y: 2,
                                radius: { min: 1, max: 1 },
                            },
                        },
                    },
                }),
            },
        });

        expect(
            applyLayoutBatch(draft, "module.json", [
                { blueprintId: "module::hero", x: 9, y: 7 },
            ]),
        ).toBe(true);
        expect(
            draft.blueprints.hero._editor?.abilities?.worldPresence,
        ).toMatchObject({ x: 9, y: 7 });
    });
});

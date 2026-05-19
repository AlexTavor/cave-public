import { describe, it, expect } from "vitest";
import type { ModuleCartridge } from "../../../../data/schemas/module";
import { resolveAuthoredWorldPosition } from "../../../../data/schemas/v2/worldPositionDefaults";
import { harvestPositions, applyLayoutBatch } from "./layoutPersistence";
import {
    createCartridge,
    createBlueprint,
} from "../../../../engine/test/factories";

const makeRuntimeStub = (entities: any[], bodies: Record<string, any>) => ({
    getEntities: () => entities,
    getPhysicsBody: (id: string) => bodies[id],
    getCartridge: () => ({
        blueprints: {
            a: createBlueprint("a", {
                _editor: {
                    abilities: {
                        worldPresence: {
                            x: 0,
                            y: 0,
                            radius: { min: 1, max: 1 },
                        },
                    },
                },
            }),
            b: createBlueprint("b"),
            sys_world: createBlueprint("sys_world", {
                _editor: {
                    abilities: {
                        worldPresence: {
                            x: 0,
                            y: 0,
                            radius: { min: 1, max: 1 },
                        },
                    },
                },
            }),
        },
    }),
});

describe("layoutPersistence", () => {
    it("harvests finite positions only for persistable non-world blueprints", () => {
        const runtime = makeRuntimeStub(
            [{ id: "a" }, { id: "b" }, { id: "sys_world" }, { id: null }],
            {
                a: { position: resolveAuthoredWorldPosition(10, 20) },
                b: { position: { x: Number.NaN, y: 5 } },
                sys_world: { position: resolveAuthoredWorldPosition(1, 2) },
            },
        );

        const updates = harvestPositions(runtime as any);
        expect(updates).toEqual([{ blueprintId: "a", x: 10, y: 20 }]);
    });

    it("writes only world presence coordinates and reports changes", () => {
        const cartridge: ModuleCartridge = createCartridge("game.json", {
            blueprints: {
                hero: createBlueprint("hero", {
                    _editor: {
                        abilities: {
                            worldPresence: {
                                x: 1,
                                y: 2,
                                radius: { min: 10, max: 10 },
                            },
                        },
                    },
                    components: {
                        display: { label: "Hero", display_key: "unknown" },
                        physics: {
                            x: 0,
                            y: 0,
                            radius: 10,
                            mass: 1,
                            drag: 0,
                            isStatic: false,
                        },
                        spatial: { x: 0, y: 0, radius: { min: 10, max: 10 } },
                    },
                }),
            },
        });

        const changed = applyLayoutBatch(cartridge, "hero.json", [
            { blueprintId: "hero", x: 64, y: 128 },
        ]);

        expect(changed).toBe(true);
        expect(
            cartridge.blueprints.hero._editor?.abilities?.worldPresence?.x,
        ).toBe(64);
        expect(
            cartridge.blueprints.hero._editor?.abilities?.worldPresence?.y,
        ).toBe(128);
        expect(cartridge.blueprints.hero.components.physics?.x).toBe(0);
        expect(cartridge.blueprints.hero.components.physics?.y).toBe(0);
        expect(cartridge.blueprints.hero.components.spatial?.x).toBe(0);
        expect(cartridge.blueprints.hero.components.spatial?.y).toBe(0);
    });

    it("returns false when no persistable blueprint matches", () => {
        const cartridge = createCartridge("game.json", {
            blueprints: { hero: createBlueprint("hero") },
        });

        expect(
            applyLayoutBatch(cartridge, "hero.json", [
                { blueprintId: "hero", x: 1, y: 2 },
            ]),
        ).toBe(false);
    });
});


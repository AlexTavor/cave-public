import { describe, it, expect } from "vitest";
import type { ModuleCartridge } from "../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../data/schemas/assets";
import { createGameRuntime } from "./createGameRuntime";
const makeModule = (): ModuleCartridge => ({
    metadata: {
        id: "core.json",
        name: "Core",
        version: "0.0.1",
    },
    blueprints: {},
    assets: {
        displays: {},
        icons: {},
        resources: {},
        styles: {},
        traits: {},
        settings: {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
            vein_network: DEFAULT_VEIN_CONFIG,
        },
    },
});
const getEntity = (runtime: ReturnType<typeof createGameRuntime>, id: string) =>
    runtime.getWorld().entities.find((entity) => entity.id === id);

const getStateValue = (
    runtime: ReturnType<typeof createGameRuntime>,
    id: string,
    key: string,
): number => {
    const entity = getEntity(runtime, id) as any;
    const entry = entity?.state?.[key];
    return typeof entry?.value === "number" ? entry.value : 0;
};
const countPendingTransfers = (
    runtime: ReturnType<typeof createGameRuntime>,
): number =>
    runtime
        .getWorld()
        .entities.filter((entity) =>
            Array.isArray(entity.tags)
                ? entity.tags.includes("pending_transfer")
                : false,
        ).length;
describe("runtime behavior integration", () => {
    it("emits transfers from behavior actions", () => {
        const runtime = createGameRuntime(makeModule(), "seed");
        runtime.addEntity({
            id: "entity_src",
            state: { wood: { value: 10 } },
            behavior: {
                rules: [
                    {
                        id: "b1",
                        sortKey: "sk_b1",
                        conditions: [
                            {
                                id: "c1",
                                sortKey: "sk_c1",
                                tokens: [{ t: "val", v: 1 }],
                            },
                        ],
                        actions: [
                            {
                                type: "TRANSFER",
                                source: "self",
                                target: "entity_tgt",
                                resource: "wood",
                                amount: 1,
                            },
                        ],
                    },
                ],
            },
        });

        runtime.addEntity({ id: "entity_tgt" });
        runtime.tick(40);
        expect(countPendingTransfers(runtime)).toBe(1);
    });

    it("mutates state via behavior actions", () => {
        const runtime = createGameRuntime(makeModule(), "seed");
        runtime.addEntity({
            id: "entity_src",
            state: { hp: { value: 0 } },
            behavior: {
                rules: [
                    {
                        id: "b2",
                        sortKey: "sk_b2",
                        conditions: [
                            {
                                id: "c2",
                                sortKey: "sk_c2",
                                tokens: [{ t: "val", v: 1 }],
                            },
                        ],
                        actions: [
                            {
                                type: "MUTATE",
                                target: "self.state.hp",
                                op: "ADD",
                                value: 1,
                            },
                        ],
                    },
                ],
            },
        });

        runtime.tick(40);
        expect(getStateValue(runtime, "entity_src", "hp")).toBe(1);
    });
});


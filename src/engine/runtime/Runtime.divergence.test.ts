import { describe, it, expect } from "vitest";
import { createGameRuntime } from "./createGameRuntime";
import type { ModuleCartridge } from "../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../data/schemas/assets";
import { RuntimeCommandType } from "./types";
import { LOGIC_STEP_MS } from "./runtimeConstants";

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

const makeRuntime = () => createGameRuntime(makeModule(), "seed");

describe("Runtime State Divergence", () => {
    it("ensures mutations in handlers are visible to the runtime store immediately", () => {
        const runtime = makeRuntime();
        const entityId = "test-entity";
        const initialState = { val: { value: 10, visible: true } };
        runtime.addEntity({
            id: entityId,
            state: initialState,
        });
        const ref1 = runtime.getEntity(entityId);
        expect(ref1).toBeDefined();
        expect((ref1 as any).state.val.value).toBe(10);

        runtime.commands.enqueue({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId,
                key: "val",
                value: 20,
            },
        });
        runtime.tick(LOGIC_STEP_MS);
        expect((ref1 as any).state.val.value).toBe(20);
        const ref2 = runtime.getEntity(entityId);
        expect(ref2).toBe(ref1);
        expect((ref2 as any).state.val.value).toBe(20);
    });

    it("ensures ADJUST_STATE mutations are visible to next snapshot", () => {
        const runtime = makeRuntime();
        const entityId = "adjust-entity";
        runtime.addEntity({
            id: entityId,
            state: { hp: { value: 100 } },
        });

        runtime.commands.enqueue({
            type: RuntimeCommandType.ADJUST_STATE,
            payload: {
                entityId,
                key: "hp",
                delta: -10,
            },
        });
        runtime.tick(LOGIC_STEP_MS);
        const ent = runtime.getEntity(entityId);
        expect((ent as any).state.hp.value).toBe(90);
        const snapshot = runtime.createSnapshot();
        const snapEnt = snapshot.getEntity(entityId);
        expect((snapEnt as any).state.hp.value).toBe(90);
    });

    it("verifies TransferHandler debit persists across ticks", () => {
        const runtime = makeRuntime();
        const sourceId = "source";
        const targetId = "target";

        runtime.addEntity({
            id: sourceId,
            state: { wood: { value: 100 } },
        });
        runtime.addEntity({
            id: targetId,
            state: { wood: { value: 0 } },
        });

        runtime.commands.enqueue({
            type: RuntimeCommandType.TRANSFER_ASSETS,
            payload: {
                sourceId,
                targetId,
                payload: { wood: 10 },
            },
        });
        runtime.tick(LOGIC_STEP_MS);
        const source = runtime.getEntity(sourceId);
        expect((source as any).state.wood.value).toBe(90);

        runtime.tick(LOGIC_STEP_MS);
        expect((source as any).state.wood.value).toBe(90);
    });
});


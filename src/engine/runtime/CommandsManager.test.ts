import { describe, it, expect, vi } from "vitest";
import { World } from "miniplex";
import type { ModuleCartridge } from "../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../data/schemas/assets";
import { CommandsManager } from "./CommandsManager";
import type { RuntimeCommand } from "./types";
import { RuntimeCommandType } from "./types";
import type { CommandHandlerContext } from "./handlers/types";
import { ImpulseEngine } from "../physics/impulse/ImpulseEngine";
import { createDirtyWorld } from "./worldUtils";

const makeCartridge = (): ModuleCartridge => ({
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

const makeContext = (): CommandHandlerContext => {
    const world = new World();
    const markEntityListDirty = vi.fn();

    return {
        world: createDirtyWorld(world, markEntityListDirty),
        cartridge: makeCartridge(),
        impulseEngine: new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
        markEntityListDirty,
        telemetry: {
            log: vi.fn(),
        },
    };
};

describe("CommandsManager", () => {
    it("buffers and drains commands", () => {
        const manager = new CommandsManager();
        manager.enqueue({
            type: RuntimeCommandType.SPAWN,
            payload: { blueprintId: "npc" },
        });
        manager.enqueue({
            type: RuntimeCommandType.KILL,
            payload: { entityId: "npc-1" },
        });

        expect(manager.size()).toBe(2);
        const drained = manager.drain();
        expect(drained).toHaveLength(2);
        expect(manager.size()).toBe(0);
    });

    it("processes registered handlers", () => {
        const manager = new CommandsManager();
        const handler = vi.fn(
            (_command: RuntimeCommand, _context: CommandHandlerContext) =>
                undefined,
        );

        manager.registerHandler({
            type: RuntimeCommandType.SPAWN,
            handle: handler,
        });

        manager.enqueue({
            type: RuntimeCommandType.SPAWN,
            payload: { blueprintId: "npc" },
        });

        manager.process(makeContext());
        expect(handler).toHaveBeenCalled();
    });

    it("logs errors for missing handlers", () => {
        const manager = new CommandsManager();
        const context = makeContext();

        manager.enqueue({
            type: RuntimeCommandType.KILL,
            payload: { entityId: "ghost" },
        });

        manager.process(context);
        expect(context.telemetry.log).toHaveBeenCalledWith(
            "errors",
            expect.stringContaining("KILL"),
        );
    });

    it("clears buffer after process", () => {
        const manager = new CommandsManager();
        manager.registerHandler({
            type: RuntimeCommandType.SPAWN,
            handle: vi.fn(
                (_command: RuntimeCommand, _context: CommandHandlerContext) =>
                    undefined,
            ),
        });
        manager.enqueue({
            type: RuntimeCommandType.SPAWN,
            payload: { blueprintId: "npc" },
        });

        manager.process(makeContext());
        expect(manager.size()).toBe(0);
    });
});


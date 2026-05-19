import { vi } from "vitest";
import { World } from "miniplex";
import { ImpulseEngine } from "../../physics/impulse/ImpulseEngine";
import type { ModuleCartridge } from "../../../data/schemas/module";
import type { CommandHandlerContext } from "./types";
import type { RuntimeEntity } from "../types";
import { createDirtyWorld } from "../worldUtils";
import { createCartridge } from "../../test/factories";
import { resolveImpulseConfig } from "../runtimeImpulseConfig";
import { CommandsManager } from "../CommandsManager";

export const makeHandlerContext = (
    cartridge: ModuleCartridge = createCartridge("core"),
): CommandHandlerContext => {
    const world = new World<RuntimeEntity>();
    const markEntityListDirty = vi.fn();

    return {
        world: createDirtyWorld(world, markEntityListDirty),
        cartridge,
        impulseEngine: new ImpulseEngine(resolveImpulseConfig(cartridge)),
        commands: new CommandsManager(),
        markEntityListDirty,
        telemetry: {
            log: vi.fn(),
        },
    };
};


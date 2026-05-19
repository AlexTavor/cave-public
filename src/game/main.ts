import type { ModuleCartridge } from "../data/schemas/module";
import {
    DEFAULT_GAME_CONFIG,
    GameConfigSchema,
} from "../data/schemas/game/config";
import { BlueprintConfigSchema } from "../data/schemas/blueprintConfig";
import type { TraitIndex } from "./systems/trait/traitTickUtils";
import type { RuntimeTelemetryAdapter } from "../engine/runtime/createGameRuntime";
import { createGameRuntime } from "../engine/runtime/createGameRuntime";
import type { Runtime } from "../engine/runtime/Runtime";
import { CensusSystem } from "./systems/CensusSystem";
import { BodySystem } from "./systems/BodySystem";
import { AssignmentOwnerValiditySystem } from "./systems/AssignmentOwnerValiditySystem";
import { BodyAssignmentSystem } from "./systems/BodyAssignmentSystem";
import { CaveSystem } from "./systems/CaveSystem";
import { CaveMindSystem } from "./systems/CaveMindSystem";
import { AttributePoolSystem } from "./systems/AttributePoolSystem.ts";
import { DynamicPhysicsSystem } from "./systems/DynamicPhysicsSystem";
import { EnergyDistributionSystem } from "./systems/EnergyDistributionSystem";
import { PointerSystem } from "./systems/PointerSystem";
import { PowerAssignmentSystem } from "./systems/PowerAssignmentSystem";
import { ProcessingNodeSystem } from "./systems/ProcessingNodeSystem";
import { CarrierSystem } from "./systems/CarrierSystem";
import { CarrierInteractionSystem } from "./systems/CarrierInteractionSystem";
import { DraftSystem } from "./systems/DraftSystem";
import { CycleCompletedFactsSystem } from "./systems/CycleCompletedFactsSystem";
import { FactsSystem } from "./systems/FactsSystem";
import { HardTutorialSystem } from "./systems/HardTutorialSystem";
import { PassiveEffectsSystem } from "./systems/passive-effects/PassiveEffectSystem.ts";
import { TraitSystem } from "./systems/TraitSystem";
import { PurgeNarrativeSystem } from "./systems/PurgeNarrativeSystem";
import { registerGameCommandHandlers } from "./registerGameCommandHandlers";

export const createGame = (
    cartridge: ModuleCartridge,
    seed: string,
    telemetry?: RuntimeTelemetryAdapter,
    executeCommand?: (command: string) => void,
): Runtime => {
    const runtime = createGameRuntime(
        cartridge,
        seed,
        telemetry,
        executeCommand,
    );

    const parsedConfig = GameConfigSchema.safeParse(
        cartridge.config?.settings?.game_config,
    );
    const gameConfig = parsedConfig.success
        ? parsedConfig.data
        : DEFAULT_GAME_CONFIG;
    const blueprintConfig = BlueprintConfigSchema.parse(cartridge.config ?? {});

    const traitIndex = blueprintConfig.traits as TraitIndex;

    runtime.registerPreBehaviorSystem(new CensusSystem());

    runtime.registerPreBehaviorSystem(
        new PassiveEffectsSystem(runtime.getGlobalEffectsIndexer()),
    );
    runtime.registerSystem(new FactsSystem(() => runtime.getTimeScale()));
    runtime.registerSystem(new CycleCompletedFactsSystem());
    runtime.registerSystem(
        new HardTutorialSystem(
            () => cartridge.config?.settings?.conditions ?? [],
            () => cartridge.config?.settings?.guidances ?? [],
            () => cartridge.config?.settings?.tutorials ?? [],
        ),
    );
    runtime.registerSystem(new TraitSystem(traitIndex));
    runtime.registerSystem(new CaveSystem(gameConfig));
    runtime.registerSystem(new CaveMindSystem(gameConfig.caveDisplay));
    runtime.registerSystem(
        new BodySystem(
            traitIndex,
            blueprintConfig.settings.body,
            blueprintConfig.habiti,
        ),
    );
    runtime.registerSystem(new AssignmentOwnerValiditySystem());
    runtime.registerSystem(new BodyAssignmentSystem());
    runtime.registerSystem(new PointerSystem());
    runtime.registerSystem(new AttributePoolSystem());
    runtime.registerSystem(new PowerAssignmentSystem());
    runtime.registerSystem(new EnergyDistributionSystem());
    runtime.registerSystem(new ProcessingNodeSystem());
    runtime.registerSystem(new CarrierSystem());
    runtime.registerSystem(new CarrierInteractionSystem());
    runtime.registerSystem(new DynamicPhysicsSystem());
    runtime.registerSystem(new DraftSystem());
    runtime.registerSystem(new PurgeNarrativeSystem(gameConfig));

    registerGameCommandHandlers(runtime);

    return runtime;
};


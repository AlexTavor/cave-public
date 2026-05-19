import type { CommandHandler } from "../engine/runtime/handlers/types";
import type { Runtime } from "../engine/runtime/Runtime";
import type { RuntimeCommand } from "../engine/runtime/types";
import { UpdateBodiesBatchHandler } from "./handlers/UpdateBodiesBatchHandler";
import { UpdateTraitsBatchHandler } from "./handlers/UpdateTraitsBatchHandler";
import { DormancyHandler } from "./handlers/DormancyHandler";
import { AwakenCaveHandler } from "./handlers/AwakenCaveHandler";
import { KillAllBodiesExceptHandler } from "./handlers/KillAllBodiesExceptHandler";
import { SetTargetHandler } from "./handlers/SetTargetHandler";
import { TriggerDraftHandler } from "./handlers/TriggerDraftHandler";
import { ResolveDraftHandler } from "./handlers/ResolveDraftHandler";
import { ClearDraftHandler } from "./handlers/ClearDraftHandler";
import { AdjustFactHandler } from "./handlers/AdjustFactHandler";
import { SetTutorialStateHandler } from "./handlers/SetTutorialStateHandler";
import { AcknowledgeHabitiAnnouncementHandler } from "./handlers/AcknowledgeHabitiAnnouncementHandler";
import { AcknowledgeNotificationAbilityGuidanceHandler } from "./handlers/AcknowledgeNotificationAbilityGuidanceHandler";
import { AcknowledgeTutorialModalGuidanceHandler } from "./handlers/AcknowledgeTutorialModalGuidanceHandler";
import { ShowNotificationAbilityGuidanceHandler } from "./handlers/ShowNotificationAbilityGuidanceHandler";
import { SpawnCarrierHandler } from "./handlers/SpawnCarrierHandler";
import { UpdateCaveWithResourceGainBonusHandler } from "./handlers/UpdateCaveWithResourceGainBonusHandler";
import { GainHabitiHandler } from "./handlers/GainHabitiHandler";
import { GainUnderstandingHandler } from "./handlers/GainUnderstandingHandler";
import { AssignBodiesBatchHandler } from "./handlers/AssignBodiesBatchHandler";
import { ResolveBodyProcessingHandler } from "./handlers/ResolveBodyProcessingHandler";

export const registerGameCommandHandlers = (runtime: Runtime) => {
    runtime.registerCommandHandler(new UpdateBodiesBatchHandler());
    runtime.registerCommandHandler(new UpdateTraitsBatchHandler());
    runtime.registerCommandHandler(new AssignBodiesBatchHandler());
    runtime.registerCommandHandler(new ResolveBodyProcessingHandler());
    runtime.registerCommandHandler(
        new SpawnCarrierHandler() as CommandHandler<RuntimeCommand>,
    );
    runtime.registerCommandHandler(new DormancyHandler());
    runtime.registerCommandHandler(new AwakenCaveHandler());
    runtime.registerCommandHandler(new KillAllBodiesExceptHandler());
    runtime.registerCommandHandler(
        new GainHabitiHandler() as CommandHandler<RuntimeCommand>,
    );
    runtime.registerCommandHandler(
        new GainUnderstandingHandler() as CommandHandler<RuntimeCommand>,
    );
    runtime.registerCommandHandler(new SetTargetHandler());
    runtime.registerCommandHandler(new TriggerDraftHandler());
    runtime.registerCommandHandler(new ResolveDraftHandler());
    runtime.registerCommandHandler(new ClearDraftHandler());
    runtime.registerCommandHandler(
        new AdjustFactHandler() as CommandHandler<RuntimeCommand>,
    );
    runtime.registerCommandHandler(
        new SetTutorialStateHandler() as CommandHandler<RuntimeCommand>,
    );
    runtime.registerCommandHandler(
        new ShowNotificationAbilityGuidanceHandler() as CommandHandler<RuntimeCommand>,
    );
    runtime.registerCommandHandler(
        new AcknowledgeNotificationAbilityGuidanceHandler() as CommandHandler<RuntimeCommand>,
    );
    runtime.registerCommandHandler(
        new AcknowledgeTutorialModalGuidanceHandler() as CommandHandler<RuntimeCommand>,
    );
    runtime.registerCommandHandler(
        new AcknowledgeHabitiAnnouncementHandler() as CommandHandler<RuntimeCommand>,
    );
    runtime.registerCommandHandler(
        new UpdateCaveWithResourceGainBonusHandler() as CommandHandler<RuntimeCommand>,
    );
};

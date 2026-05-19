import type {
    AdjustFactCommand,
    CancelTransferCommand,
    KillCommand,
    PatchBlueprintCommand,
    PositionEntityCommand,
    ResolveTransferCommand,
    SetGlobalCommand,
    SpawnAutomationCommand,
    SpawnCommand,
    TransferAssetsCommand,
} from "./runtimeCommandBase";
import type {
    AssignBodiesBatchCommand,
    AdjustStateCommand,
    ExecuteAutomationCommand,
    GainHabitiCommand,
    GainUnderstandingCommand,
    ResolveBodyProcessingCommand,
    SetPhysicsLayerCommand,
    UpdateAutomationCommand,
    UpdateBodiesBatchCommand,
    UpdateCaveCommand,
    UpdatePowerSinkCommand,
    UpdateStateCommand,
    UpdateAssignmentCommand,
    UpdateTraitsBatchCommand,
} from "./runtimeCommandUpdates";
import type {
    AwakenCaveCommand,
    GameDormancyCommand,
    KillAllBodiesExceptCommand,
    SetTargetCommand,
} from "./runtimeCommandAbsorption";
import type {
    ClearDraftCommand,
    ResolveDraftCommand,
    TriggerDraftCommand,
} from "./runtimeCommandDraft";
import type {
    AcknowledgeTutorialModalGuidanceCommand,
    SetTutorialStateCommand,
} from "./runtimeCommandTutorial";
import type {
    AcknowledgeThoughtCommand,
    ClearThoughtCommand,
    ShowThoughtCommand,
} from "./runtimeCommandThought";
import type { AcknowledgeHabitiAnnouncementCommand } from "./runtimeCommandHabiti";
import type { SpawnCarrierCommand } from "./runtimeCommandCarrier";
import type { ShowCinematicCommand } from "./runtimeCommandCinematic";
import type {
    AcknowledgeNotificationAbilityGuidanceCommand,
    ShowNotificationAbilityGuidanceCommand,
} from "./runtimeCommandNotificationAbilityGuidance";

export type RuntimeCommand =
    | SpawnCommand
    | SpawnAutomationCommand
    | KillCommand
    | TransferAssetsCommand
    | ResolveTransferCommand
    | CancelTransferCommand
    | PatchBlueprintCommand
    | PositionEntityCommand
    | SetGlobalCommand
    | UpdateStateCommand
    | AdjustStateCommand
    | AdjustFactCommand
    | UpdateAutomationCommand
    | ExecuteAutomationCommand
    | UpdateBodiesBatchCommand
    | UpdatePowerSinkCommand
    | UpdateCaveCommand
    | SpawnCarrierCommand
    | GainUnderstandingCommand
    | GainHabitiCommand
    | UpdateAssignmentCommand
    | AssignBodiesBatchCommand
    | SetPhysicsLayerCommand
    | ResolveBodyProcessingCommand
    | KillAllBodiesExceptCommand
    | SetTargetCommand
    | GameDormancyCommand
    | AwakenCaveCommand
    | TriggerDraftCommand
    | ResolveDraftCommand
    | ClearDraftCommand
    | SetTutorialStateCommand
    | AcknowledgeTutorialModalGuidanceCommand
    | ShowThoughtCommand
    | AcknowledgeThoughtCommand
    | ClearThoughtCommand
    | UpdateTraitsBatchCommand
    | ShowCinematicCommand
    | AcknowledgeHabitiAnnouncementCommand
    | ShowNotificationAbilityGuidanceCommand
    | AcknowledgeNotificationAbilityGuidanceCommand;


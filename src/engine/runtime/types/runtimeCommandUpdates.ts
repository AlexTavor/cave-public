import type {
    AssignBodiesBatchCommandPayload,
    AdjustStateCommandPayload,
    ExecuteAutomationCommandPayload,
    GainHabitiCommandPayload,
    GainUnderstandingCommandPayload,
    ResolveBodyProcessingCommandPayload,
    SetPhysicsLayerCommandPayload,
    UpdateAutomationCommandPayload,
    UpdateBodiesBatchCommandPayload,
    UpdateCaveCommandPayload,
    UpdatePowerSinkCommandPayload,
    UpdateStateCommandPayload,
    UpdateAssignmentCommandPayload,
    UpdateTraitsBatchCommandPayload,
} from "./runtimeCommandPayloads";
import { RuntimeCommandType } from "./runtimeCommandTypes";
import type { Command } from "./runtimeCommandBase";

export type UpdateStateCommand = Command<
    RuntimeCommandType.UPDATE_STATE,
    UpdateStateCommandPayload
>;
export type AdjustStateCommand = Command<
    RuntimeCommandType.ADJUST_STATE,
    AdjustStateCommandPayload
>;
export type UpdateAutomationCommand = Command<
    RuntimeCommandType.UPDATE_AUTOMATION,
    UpdateAutomationCommandPayload
>;
export type ExecuteAutomationCommand = Command<
    RuntimeCommandType.EXECUTE_AUTOMATION,
    ExecuteAutomationCommandPayload
>;
export type UpdateBodiesBatchCommand = Command<
    RuntimeCommandType.UPDATE_BODIES_BATCH,
    UpdateBodiesBatchCommandPayload
>;
export type UpdatePowerSinkCommand = Command<
    RuntimeCommandType.UPDATE_POWER_SINK,
    UpdatePowerSinkCommandPayload
>;
export type UpdateCaveCommand = Command<
    RuntimeCommandType.UPDATE_CAVE,
    UpdateCaveCommandPayload
>;
export type GainUnderstandingCommand = Command<
    RuntimeCommandType.GAIN_UNDERSTANDING,
    GainUnderstandingCommandPayload
>;
export type GainHabitiCommand = Command<
    RuntimeCommandType.GAIN_HABITI,
    GainHabitiCommandPayload
>;
export type UpdateAssignmentCommand = Command<
    RuntimeCommandType.UPDATE_ASSIGNMENT,
    UpdateAssignmentCommandPayload
>;
export type AssignBodiesBatchCommand = Command<
    RuntimeCommandType.ASSIGN_BODIES_BATCH,
    AssignBodiesBatchCommandPayload
>;
export type SetPhysicsLayerCommand = Command<
    RuntimeCommandType.SET_PHYSICS_LAYER,
    SetPhysicsLayerCommandPayload
>;
export type ResolveBodyProcessingCommand = Command<
    RuntimeCommandType.RESOLVE_BODY_PROCESSING,
    ResolveBodyProcessingCommandPayload
>;
export type UpdateTraitsBatchCommand = Command<
    RuntimeCommandType.UPDATE_TRAITS_BATCH,
    UpdateTraitsBatchCommandPayload
>;


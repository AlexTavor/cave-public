import type {
  AdjustFactCommandPayload,
  CancelTransferCommandPayload,
  KillCommandPayload,
  PatchBlueprintCommandPayload,
  PositionEntityCommandPayload,
  ResolveTransferCommandPayload,
  SetGlobalCommandPayload,
  SpawnAutomationCommandPayload,
  SpawnCommandPayload,
  TransferAssetsCommandPayload,
} from "./runtimeCommandPayloads";
import { RuntimeCommandType } from "./runtimeCommandTypes";

export type { Command } from "./runtimeCommandGeneric";
import type { Command } from "./runtimeCommandGeneric";

export type SpawnCommand = Command<
  RuntimeCommandType.SPAWN,
  SpawnCommandPayload
>;
export type SpawnAutomationCommand = Command<
  RuntimeCommandType.SPAWN_AUTOMATION,
  SpawnAutomationCommandPayload
>;
export type KillCommand = Command<RuntimeCommandType.KILL, KillCommandPayload>;
export type TransferAssetsCommand = Command<
  RuntimeCommandType.TRANSFER_ASSETS,
  TransferAssetsCommandPayload
>;
export type ResolveTransferCommand = Command<
  RuntimeCommandType.RESOLVE_TRANSFER,
  ResolveTransferCommandPayload
>;
export type CancelTransferCommand = Command<
  RuntimeCommandType.CANCEL_TRANSFER,
  CancelTransferCommandPayload
>;
export type PatchBlueprintCommand = Command<
  RuntimeCommandType.PATCH_BLUEPRINT,
  PatchBlueprintCommandPayload
>;
export type PositionEntityCommand = Command<
  RuntimeCommandType.POSITION_ENTITY,
  PositionEntityCommandPayload
>;
export type SetGlobalCommand = Command<
  RuntimeCommandType.SET_GLOBAL,
  SetGlobalCommandPayload
>;
export type AdjustFactCommand = Command<
  RuntimeCommandType.ADJUST_FACT,
  AdjustFactCommandPayload
>;

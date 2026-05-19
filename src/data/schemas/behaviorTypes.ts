import type { LogicRule } from "./logic";
import type { ShowCinematicAction } from "./behaviorCinematic";
import type {
    GainHabitiAction,
    GainUnderstandingAction,
} from "./behaviorRewardTypes";
export type {
    GainHabitiAction,
    GainUnderstandingAction,
} from "./behaviorRewardTypes";

export type ActionValue = number | string;

export interface MutateAction {
    type: "MUTATE";
    target: string;
    op: "SET" | "ADD" | "SUB";
    value: ActionValue;
}

export interface TransferAction {
    type: "TRANSFER";
    source: string;
    target: string;
    resource: string;
    amount: ActionValue;
    isImmediate?: boolean;
}

export interface SpawnAction {
    type: "SPAWN";
    blueprintId: string;
    id?: string;
    parentId?: string;
    forcedHabiti?: string[];
}
export interface SpawnBodyAction {
    type: "SPAWN_BODY";
    blueprintId: string;
    target?: string;
    parentId?: string;
    forcedHabiti?: string[];
}
export interface KillAction {
    type: "KILL";
    entityId: string;
}
export interface KillAllBodiesExceptAction {
    type: "KILL_ALL_BODIES_EXCEPT";
    quantity: number;
}
export interface PatchBlueprintAction {
    type: "PATCH_BLUEPRINT";
    blueprintId: string;
    components: Record<string, unknown>;
}
export interface AddTraitAction {
    type: "ADD_TRAIT";
    traitId: string;
}
export interface RemoveTraitAction {
    type: "REMOVE_TRAIT";
    traitId: string;
}
export interface DispatchAction {
    type: "DISPATCH";
    entity: string;
    target: string;
}
export interface TriggerDraftAction {
    type: "TRIGGER_DRAFT";
    poolId: string;
    count?: number;
    label?: string;
    triggerEntityId?: string;
    onComplete?: BehaviorAction[];
}

export interface SpawnCarrierAction {
    type: "SPAWN_CARRIER";
    tags: string[];
    commands: BehaviorAction[];
}

export interface ShowNotificationAbilityGuidanceAction {
    type: "SHOW_NOTIFICATION_ABILITY_GUIDANCE";
    abilityId: string;
    title: string;
    text: string;
    imageUrl: string | null;
}

export type BehaviorAction =
    | MutateAction
    | TransferAction
    | SpawnAction
    | SpawnBodyAction
    | KillAction
    | KillAllBodiesExceptAction
    | PatchBlueprintAction
    | AddTraitAction
    | RemoveTraitAction
    | DispatchAction
    | TriggerDraftAction
    | GainUnderstandingAction
    | GainHabitiAction
    | SpawnCarrierAction
    | ShowNotificationAbilityGuidanceAction
    | ShowCinematicAction;

export interface BehaviorRule {
    id: string;
    sortKey: string;
    conditions: LogicRule[];
    actions: BehaviorAction[];
}

export interface BehaviorComponent {
    rules: BehaviorRule[];
}

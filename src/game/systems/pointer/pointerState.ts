import type { Snapshot } from "../../../engine/runtime/Snapshot";
import type {
    CommandBuffer,
    RuntimeCommand,
    RuntimeEntity,
} from "../../../engine/runtime/types";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import {
    isAssignableTargetNode,
    resolveAssignmentOwnerKind,
} from "../../assignment/assignmentNodeKinds";
import { isPointerAssignmentBlocked } from "./pointerConditionalActivation";
import { resolvePowerPointerPreview } from "./pointerPowerPreview";
const zeroPreview = () => ({
    amount: 0,
    body: 0,
    mind: 0,
    social: 0,
    mode: "none" as const,
    dominant: "none" as const,
});

export const readPointerBool = (entity: RuntimeEntity, key: string) =>
    (entity as { state?: Record<string, { value?: unknown }> }).state?.[key]
        ?.value === true;

export const collectPointerTargets = (snapshot: Snapshot) =>
    snapshot.getEntities().flatMap((entity) => {
        const physics = entity.id
            ? snapshot.getPhysicsBody(entity.id)
            : undefined;
        if (
            !entity.id ||
            !physics ||
            !isAssignableTargetNode(entity as any) ||
            isPointerAssignmentBlocked(snapshot, entity as any)
        ) {
            return [];
        }
        return [
            {
                id: entity.id,
                x: physics.x,
                y: physics.y,
                radius: physics.radius ?? 0,
                kind: resolveAssignmentOwnerKind(entity as any),
            },
        ];
    });

export const resolvePointerPreviewState = (
    nextBody: RuntimeEntity | undefined,
    targetEntity: RuntimeEntity | undefined,
) => {
    if (!nextBody || !targetEntity) return zeroPreview();
    const targetKind = resolveAssignmentOwnerKind(targetEntity as any);
    if (targetKind === "processing")
        return {
            ...zeroPreview(),
            amount: 1,
            mode: "nervous",
        };
    if (targetKind !== "power") return zeroPreview();
    return resolvePowerPointerPreview([nextBody], targetEntity);
};

export const enqueuePointerState = (
    commands: CommandBuffer<RuntimeCommand>,
    entries: Array<[string, number | string | boolean]>,
) => {
    entries.forEach(([key, value]) =>
        commands.enqueue({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: { entityId: "sys_pointer", key, value, visible: false },
        }),
    );
};

import { resolveImpulseConfig } from "../../engine/runtime/runtimeImpulseConfig";
import type { RuntimeCommand, RuntimeEntity } from "../../engine/runtime/types";
import {
    patchCommandMetadataInPlace,
    RuntimeCommandType,
} from "../../engine/runtime/types";
import type { CommandHandlerContext } from "../../engine/runtime/handlers/types";
import { resetBodyAssignmentProgress } from "../assignment/bodyAssignment";
import {
    incrementDestroyedCaveCounters,
    markAssignmentNodeDepleted,
    pulseAssignmentCompletion,
} from "./processingFinalization";
import {
    resolveOutputAmount,
    resolveProcessingOutputs,
} from "./processingOutputs";
import { syncPendingHabiti } from "./processingPendingHabiti";
import { spawnYieldSpectacle } from "./processingSpectacle";

const findEntity = (entities: RuntimeEntity[], id: string) =>
    entities.find((entity) => entity.id === id);
const destroysBodies = (node: RuntimeEntity) =>
    (node as { state?: any }).state?.processing_destroys_assigned_bodies
        ?.value === true;
const resolveOutputTarget = (
    entities: RuntimeEntity[],
    node: RuntimeEntity,
    targetId: string | undefined,
) => {
    if (!targetId) return findEntity(entities, "sys_world");
    if (targetId === "self") return node;
    return findEntity(entities, targetId);
};

const appendKilledBodyPresentation = (
    command: Extract<
        RuntimeCommand,
        { type: RuntimeCommandType.RESOLVE_BODY_PROCESSING }
    >,
    context: CommandHandlerContext,
    bodyId: string,
) => {
    const body = context.impulseEngine.getBody(bodyId);
    if (!body) return;
    const killedEntityPresentations = [
        ...(command.metadata?.killedEntityPresentations ?? []),
        { entityId: bodyId, x: body.x, y: body.y, radius: body.radius },
    ];
    patchCommandMetadataInPlace(command, { killedEntityPresentations });
};

const releaseBodyToWorld = (
    context: CommandHandlerContext,
    bodyId: string,
): void => {
    context.commands?.enqueue({
        type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
        payload: { updates: [{ bodyId, ownerId: "sys_world" }] },
    });
};

const destroyProcessedBody = (
    command: Extract<
        RuntimeCommand,
        { type: RuntimeCommandType.RESOLVE_BODY_PROCESSING }
    >,
    context: CommandHandlerContext,
    world: RuntimeEntity,
    node: RuntimeEntity,
    body: RuntimeEntity,
    bodyId: string,
): void => {
    appendKilledBodyPresentation(command, context, bodyId);
    context.world.remove(body);
    context.impulseEngine.removeBody(bodyId);
    incrementDestroyedCaveCounters(world, node, 1);
};

export const handleResolvedBodyProcessing = (
    command: Extract<
        RuntimeCommand,
        { type: RuntimeCommandType.RESOLVE_BODY_PROCESSING }
    >,
    context: CommandHandlerContext,
) => {
    const node = findEntity(context.world.entities, command.payload.nodeId);
    const body = findEntity(context.world.entities, command.payload.bodyId);
    const world = findEntity(context.world.entities, "sys_world");
    if (!node || !world || !body || !(body as { body?: unknown }).body) {
        context.telemetry.log(
            "errors",
            "RESOLVE_BODY_PROCESSING failed: invalid node/body/world.",
        );
        return;
    }
    const impulseConfig = resolveImpulseConfig(context.cartridge);
    resolveProcessingOutputs(node).forEach((output) => {
        const amount = Math.max(
            0,
            Math.floor(resolveOutputAmount((body as any).body, output)),
        );
        const target =
            amount > 0
                ? resolveOutputTarget(
                      context.world.entities,
                      node,
                      output.target,
                  )
                : null;
        if (target)
            spawnYieldSpectacle(
                context,
                body,
                target,
                output.resource,
                amount,
                impulseConfig,
            );
    });
    syncPendingHabiti(context, world, node, body);
    pulseAssignmentCompletion(node);
    markAssignmentNodeDepleted(node);
    resetBodyAssignmentProgress(body);
    const assignment = ((
        node as { assignment?: { assignedIds?: string[] } }
    ).assignment ??= {
        assignedIds: [],
    });
    assignment.assignedIds = (assignment.assignedIds ?? []).filter(
        (id) => id !== body.id,
    );
    if (!body.id) return;
    if (!destroysBodies(node)) {
        releaseBodyToWorld(context, body.id);
        return;
    }
    destroyProcessedBody(command, context, world, node, body, body.id);
};

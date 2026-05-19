import { nanoid } from "nanoid";
import type { ImpulseConfig } from "../../../data/schemas/physics";
import type { RuntimeEntity } from "../types";
import type { CommandHandlerContext } from "./types";
import type { PhysicsBody } from "../../physics/impulse/types";
import {
    buildPayloadLabel,
    buildPendingBody,
    resolveTransferVisualType,
} from "./transferUtils";
import { resolveTransferNodeRadius } from "./resolveTransferNodeRadius";
import { resolvePendingTransferSpawn } from "./transferPendingSpawn";

const PENDING_TAG = "pending_transfer";
const TRANSFER_IMPULSE_MAGNITUDE = 0.1;

export interface PendingTransferBuildResult {
    pendingEntity: RuntimeEntity;
    body: PhysicsBody;
    spawn: { x: number; y: number };
}

export const buildPendingTransfer = (params: {
    source: RuntimeEntity;
    target: RuntimeEntity;
    payload: Record<string, number>;
    context: CommandHandlerContext;
    impulseConfig: ImpulseConfig;
}): PendingTransferBuildResult => {
    const { source, target, payload, context, impulseConfig } = params;
    const sourceId = source.id;
    const targetId = target.id;
    const pendingId = `pending_${nanoid()}`;
    const label = buildPayloadLabel(payload);
    const displayKey = resolveTransferVisualType(payload) ?? "unknown";
    const { spawn, direction } = resolvePendingTransferSpawn({
        source,
        target,
        context,
    });
    const radiusResult = resolveTransferNodeRadius({
        payload,
        displays: context.cartridge.assets.displays,
        fallbackRadius: impulseConfig.transferNodeRadius,
    });
    if (radiusResult.warning) {
        context.telemetry.log("errors", radiusResult.warning);
    }

    const physics = {
        mass: impulseConfig.transferNodeMass,
        radius: radiusResult.radius,
        drag: impulseConfig.transferNodeDrag,
        isStatic: false,
        x: spawn.x,
        y: spawn.y,
    };

    const pendingEntity: RuntimeEntity = {
        id: pendingId,
        label,
        tags: [PENDING_TAG],
        transfer: {
            sourceId,
            targetId,
            payload,
            visualType: displayKey === "unknown" ? null : displayKey,
            status: "pending" as const,
        },
        physics,
        display: {
            label,
            display_key: displayKey,
            description: `Transfer to ${targetId}`,
        },
    };

    const body = buildPendingBody(
        pendingId,
        spawn,
        {
            mass: impulseConfig.transferNodeMass,
            radius: radiusResult.radius,
            drag: impulseConfig.transferNodeDrag,
            impulseMagnitude: TRANSFER_IMPULSE_MAGNITUDE,
        },
        direction,
        targetId,
    );

    return { pendingEntity, body, spawn };
};


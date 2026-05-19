import type { Runtime } from "../../../engine/runtime/Runtime";
import { resolveProgress } from "../../../game/systems/cave/purgeResolvers";
import { resolveBodyStatusCounts } from "../../../game/systems/cave/bodyStatusCounts";
import { resolveRuntimePurgeThresholdFraction } from "../purgeThresholdFraction";
import { runtimeOngoingGuidanceMap } from "./runtimeOngoingGuidanceMap";
import {
    readConfiguredSuspicionNotificationDisplays,
    resolveSuspicionNotificationDisplay,
} from "./suspicionNotificationDisplayRules";
import type { RuntimeOngoingDescriptor } from "./runtimeNotificationTypes";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const resolveSuspicionDescriptor = (
    runtime: Runtime,
    world: { state?: Record<string, { value?: unknown }> },
) => {
    const progress = world.state?.purge_progress;
    if (typeof progress?.value !== "number") {
        if ((runtime as { getCartridge?: unknown }).getCartridge)
            console.error("Missing purge progress for Suspicion notification.");
        return null;
    }
    const fraction = resolveRuntimePurgeThresholdFraction(
        runtime,
        world as Readonly<Record<string, unknown>>,
        resolveProgress(world).value,
    );
    if (fraction === null) return null;
    const rule = resolveSuspicionNotificationDisplay(
        fraction,
        readConfiguredSuspicionNotificationDisplays(runtime),
    );
    if (!rule) {
        console.error("No authored Suspicion notification display matched.");
        return null;
    }
    if (rule.text.trim().length === 0 || !HEX_COLOR.test(rule.color)) {
        console.error("Invalid authored Suspicion notification display.");
        return null;
    }
    return {
        key: "suspicion",
        kind: "suspicion",
        guidanceId: runtimeOngoingGuidanceMap.suspicion,
        priority: 4,
        levelText: rule.text,
        levelColor: rule.color,
    } satisfies RuntimeOngoingDescriptor;
};

export const resolveOngoingRuntimeNotifications = (
    runtime: Runtime | null,
): RuntimeOngoingDescriptor[] => {
    if (
        !runtime ||
        typeof runtime.getEntities !== "function" ||
        typeof runtime.getEntity !== "function"
    ) {
        return [];
    }
    const world = runtime.getEntity("sys_world") as
        | {
              cave?: { purge?: { isActive?: boolean } };
              state?: Record<string, { value?: unknown }>;
          }
        | undefined;
    const entities = runtime.getEntities();
    const { starvingBodies, coldBodies } = resolveBodyStatusCounts(entities);
    const items: RuntimeOngoingDescriptor[] = [];
    if (world?.cave?.purge?.isActive)
        items.push({
            key: "purge_active",
            kind: "purge_active",
            guidanceId: runtimeOngoingGuidanceMap.purge_active,
            priority: 1,
        });
    if (starvingBodies > 0)
        items.push({
            key: "hungry_bodies",
            kind: "hungry_bodies",
            guidanceId: runtimeOngoingGuidanceMap.hungry_bodies,
            count: starvingBodies,
            priority: 2,
        });
    if (coldBodies > 0)
        items.push({
            key: "cold_bodies",
            kind: "cold_bodies",
            guidanceId: runtimeOngoingGuidanceMap.cold_bodies,
            count: coldBodies,
            priority: 3,
        });
    if (world) {
        const suspicion = resolveSuspicionDescriptor(runtime, world);
        if (suspicion) items.push(suspicion);
    }
    return items.sort((left, right) => left.priority - right.priority);
};

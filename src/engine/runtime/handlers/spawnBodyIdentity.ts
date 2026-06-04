import type { Passport } from "../../../data/schemas/game/body";
import { bodyIdentityCatalog } from "../../../lib/body-identity/bodyIdentityCatalog";
import { resolvePassportAvatarDisplayKey } from "../../../lib/body-identity/avatarDisplayKey";
import { collectUsedBodyNames } from "../../../lib/body-identity/collectUsedBodyNames";
import { generateBodyIdentity } from "../../../lib/body-identity/bodyIdentityGenerator";
import type { BodyHabitiAssignerInput } from "./bodyHabitiAssigner";
import type { CommandHandlerContext } from "./types";
import { readWorldSeed } from "../../../utils/worldSeed";

const ensureStateRecord = (entity: { state?: Record<string, unknown> }) => {
    entity.state ??= {};
    return entity.state;
};

const readBodySerial = (entry: unknown): number => {
    const value = (entry as { value?: unknown })?.value;
    return typeof value === "number" && Number.isFinite(value)
        ? Math.max(0, Math.floor(value))
        : 0;
};

const sortIds = (ids: string[] = []) =>
    [...new Set(ids)].sort((left, right) => left.localeCompare(right));

export const ensureSpawnedBodyIdentity = (
    body: {
        passport?: Passport;
        habiti?: string[];
        assignmentId?: string;
        assignmentStatus?: "navigating" | "orbiting";
    },
    entityId: string,
    context: CommandHandlerContext,
    forcedHabiti?: string[],
): string[] | null => {
    body.passport ??= { name: "Unknown" };
    const worldEntity = context.world.entities.find(
        (entity) => entity.id === "sys_world",
    ) as
        | {
              state?: Record<string, unknown>;
              assignment?: { assignedIds?: string[] };
          }
        | undefined;
    if (!worldEntity) {
        context.telemetry.log(
            "errors",
            `Spawn failed: sys_world missing for body identity '${entityId}'.`,
        );
        return null;
    }
    body.assignmentId ??= "sys_world";
    body.assignmentStatus =
        body.assignmentId === "sys_world"
            ? "navigating"
            : (body.assignmentStatus ?? "orbiting");
    worldEntity.assignment ??= { assignedIds: [] };
    const assignment = worldEntity.assignment;
    assignment.assignedIds = [
        ...new Set([...(assignment.assignedIds ?? []), entityId]),
    ].sort((left, right) => left.localeCompare(right));
    const passport = body.passport;
    const state = ensureStateRecord(worldEntity);
    const worldSeed = readWorldSeed(worldEntity, "world");
    const nextBodySerial =
        passport.identitySerial ?? readBodySerial(state.bodySerial) + 1;
    if (passport.identitySerial == null) {
        passport.identitySerial = nextBodySerial;
        state.bodySerial = { value: nextBodySerial, visible: false };
    }
    passport.avatarDisplayKey ??=
        resolvePassportAvatarDisplayKey(passport) ?? undefined;
    // Habiti assignment is game-domain logic, injected per-runtime onto the
    // context (see bodyHabitiAssigner). With no assigner wired, leave habiti
    // unchanged — equivalent to a cartridge with no habitus rules.
    const habitiInput: BodyHabitiAssignerInput = {
        identitySerial: passport.identitySerial,
        existingHabiti: body.habiti,
        settings: context.cartridge.config?.settings?.body,
        habitusIndex: context.cartridge.config?.habiti ?? {},
        worldSeed,
        forcedHabiti,
        onInvalidForcedHabitusId: (id, reason) =>
            context.telemetry.log(
                "errors",
                `Skipped forced habitus '${id}' for '${entityId}': ${reason}.`,
            ),
    };
    const nextHabiti =
        context.assignBodyHabiti?.(habitiInput) ?? sortIds(body.habiti);
    const patch = generateBodyIdentity(
        passport.identitySerial,
        passport.name,
        nextHabiti,
        context.cartridge.config?.habiti ?? {},
        bodyIdentityCatalog,
        collectUsedBodyNames(context.world.entities as any[]),
        worldSeed,
    );
    if (patch) Object.assign(passport, patch);
    const existingHabiti = sortIds(body.habiti);
    return JSON.stringify(existingHabiti) === JSON.stringify(nextHabiti)
        ? null
        : nextHabiti;
};

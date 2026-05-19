import type { Snapshot } from "../../engine/runtime/Snapshot";
import type {
    BodyUpdatePayload,
    CommandBuffer,
    RuntimeCommand,
} from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import type { System } from "../../engine/runtime/systems/System";
import { collectUsedBodyNames } from "../../lib/body-identity/collectUsedBodyNames";
import { collectBodyResult } from "./body/collectBodyResult";
import { processBodyEntity } from "./body/processEntity";
import type {
    BodySettings,
    HabitusDefinition,
} from "../../data/schemas/game/habiti";
import type { TraitIndex } from "./body/traits";
import { buildGlobalsProxy } from "./passive-effects/passiveEffectUtils";
import {
    enqueueBodySerialUpdate,
    resolveBodySystemCaveAttributes,
    readBodySystemWorldState,
} from "./body/worldState";
import { resolveBodyIdentityTickState } from "./body/resolveBodyIdentityTickState";

const DEFAULT_XP_PER_LEVEL = 100;

export class BodySystem implements System {
    private readonly xpPerLevel: number;
    private readonly traitIndex: TraitIndex;
    private readonly bodySettings: BodySettings | undefined;
    private readonly habitusIndex: Record<string, HabitusDefinition>;
    constructor(
        traitIndex: TraitIndex,
        bodySettingsOrXp?: BodySettings | number,
        habitusIndexOrXp: Record<string, HabitusDefinition> | number = {},
        xpPerLevel: number = DEFAULT_XP_PER_LEVEL,
    ) {
        this.traitIndex = traitIndex;
        if (typeof bodySettingsOrXp === "number") {
            this.bodySettings = undefined;
            this.habitusIndex = {};
            this.xpPerLevel = bodySettingsOrXp;
            return;
        }
        this.bodySettings = bodySettingsOrXp;
        this.habitusIndex =
            typeof habitusIndexOrXp === "number" ? {} : habitusIndexOrXp;
        this.xpPerLevel =
            typeof habitusIndexOrXp === "number"
                ? habitusIndexOrXp
                : xpPerLevel;
    }
    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        dt: number,
    ): void {
        if (!Number.isFinite(dt) || dt <= 0) return;
        const globals = buildGlobalsProxy(snapshot, dt);
        const worldState = readBodySystemWorldState(snapshot);
        const caveAttributes = resolveBodySystemCaveAttributes(
            snapshot,
            this.habitusIndex,
        );
        const usedNames = collectUsedBodyNames(snapshot.getEntities() as any[]);
        const updates: BodyUpdatePayload[] = [];
        const killCommands: RuntimeCommand[] = [];
        let nextBodySerial = worldState.bodySerial;
        for (const entity of snapshot.getEntities()) {
            const identity = resolveBodyIdentityTickState({
                body: (entity as { body?: any }).body,
                nextBodySerial,
                bodySettings: this.bodySettings,
                habitusIndex: this.habitusIndex,
                usedNames,
                worldSeed: worldState.worldSeed,
            });
            nextBodySerial = identity.nextIdentitySerial;
            const result = processBodyEntity(entity, dt, this.xpPerLevel, {
                healthMultiplier: worldState.comfortMultiplier,
                worldSeed: worldState.worldSeed,
                caveAttributes,
                traitIndex: this.traitIndex,
                globals,
                passportPatch: identity.passportPatch,
                habitusPatch: identity.habitusPatch,
            });
            collectBodyResult(entity.id, result, updates, killCommands);
        }

        if (nextBodySerial !== worldState.bodySerial)
            enqueueBodySerialUpdate(commands, nextBodySerial);
        if (updates.length > 0) {
            commands.enqueue({
                type: RuntimeCommandType.UPDATE_BODIES_BATCH,
                payload: { updates },
            });
        }
        for (const command of killCommands) commands.enqueue(command);
    }
}


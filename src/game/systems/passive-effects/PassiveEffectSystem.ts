import { Snapshot } from "../../../engine/runtime/Snapshot";
import { System } from "../../../engine/runtime/systems/System";
import { CommandBuffer, RuntimeCommand } from "../../../engine/runtime/types";
import { applyPassiveEffects, buildGlobalsProxy } from "./passiveEffectUtils";
import { GlobalEffectsIndexer } from "../../../engine/runtime/systems/GlobalEffectsIndexer";
import {
    applyPendingUpdates,
    collectPassiveEffects,
} from "./passiveEffectsSystemUtils";

export class PassiveEffectsSystem implements System {
    constructor(
        private readonly globalEffectsIndexer = new GlobalEffectsIndexer(),
    ) {}

    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        _dt: number,
    ): void {
        const globalsProxy = buildGlobalsProxy(snapshot, _dt);

        for (const entity of snapshot.getEntities()) {
            if (!entity.id) continue;

            const allEffects = collectPassiveEffects(entity, snapshot, (tags) =>
                this.globalEffectsIndexer.getBuffsFor(tags),
            );

            if (allEffects.length === 0) continue;

            const pendingUpdates = applyPassiveEffects(
                entity,
                globalsProxy,
                allEffects,
            );

            applyPendingUpdates(commands, entity, pendingUpdates);
        }
    }
}

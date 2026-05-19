import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { System } from "../../engine/runtime/systems/System";
import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { buildGlobalsProxy } from "../systems/passive-effects/passiveEffectUtils";
import { applyPendingUpdates } from "../systems/passive-effects/passiveEffectsSystemUtils";
import type { TraitIndex } from "./trait/traitTickUtils";
import { processEntityTraits } from "./trait/traitTickUtils";

export class TraitSystem implements System {
    private readonly traitIndex: TraitIndex;

    constructor(traitIndex: TraitIndex) {
        this.traitIndex = traitIndex;
    }

    public tick(
        snapshot: Snapshot,
        commands: CommandBuffer<RuntimeCommand>,
        dt: number,
    ): void {
        const dtSeconds = dt / 1000;
        if (dtSeconds <= 0) return;

        const globals = buildGlobalsProxy(snapshot, dt);

        for (const entity of snapshot.getEntities()) {
            if (!entity.id) continue;

            const result = processEntityTraits(
                entity,
                dtSeconds,
                this.traitIndex,
                globals,
            );

            if (Object.keys(result.pendingUpdates).length > 0) {
                applyPendingUpdates(commands, entity, result.pendingUpdates);
            }

            if (result.changed) {
                commands.enqueue({
                    type: RuntimeCommandType.UPDATE_TRAITS_BATCH,
                    payload: {
                        updates: [
                            {
                                entityId: entity.id,
                                traits: result.survivingTraits,
                            },
                        ],
                    },
                });
            }
        }
    }
}

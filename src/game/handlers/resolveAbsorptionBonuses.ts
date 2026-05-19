import {
    mergeImpulseConfig,
    type ImpulseConfig,
} from "../../data/schemas/physics";
import type { RuntimeEntity } from "../../engine/runtime/types";
import type { CommandHandlerContext } from "../../engine/runtime/handlers/types";
import { resolveOwnedCaveKnowledgeEffects } from "../habiti/resolveOwnedCaveKnowledgeEffects";

const hasOwnedKnowledge = (
    value: unknown,
): value is { ownedHabiti?: string[]; ownedUnderstanding?: string[] } =>
    !!value && typeof value === "object";

export const resolveAbsorptionBonuses = (
    context: CommandHandlerContext,
    caveWorld: RuntimeEntity | undefined,
) => {
    const cave = hasOwnedKnowledge(caveWorld?.cave)
        ? caveWorld.cave
        : undefined;
    const assetImpulse = context.cartridge.assets.settings?.["impulse"] as
        | Partial<ImpulseConfig>
        | undefined;
    return {
        impulseConfig: mergeImpulseConfig(assetImpulse),
        habitusIndex: context.cartridge.config?.habiti ?? {},
        understandingIndex: context.cartridge.config?.understanding ?? {},
        bonuses: resolveOwnedCaveKnowledgeEffects({
            ownedHabiti: Array.isArray(cave?.ownedHabiti)
                ? cave.ownedHabiti
                : [],
            habitusIndex: context.cartridge.config?.habiti ?? {},
            ownedUnderstanding: Array.isArray(cave?.ownedUnderstanding)
                ? cave.ownedUnderstanding
                : [],
            understandingIndex: context.cartridge.config?.understanding ?? {},
            onUnknownHabitusId: (id) =>
                context.telemetry.log(
                    "errors",
                    `Unknown owned Habitus '${id}'.`,
                ),
            onUnknownUnderstandingId: (id) =>
                context.telemetry.log(
                    "errors",
                    `Unknown owned Understanding '${id}'.`,
                ),
        }),
    };
};

import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import type {
    AbilityEffectGroup,
    ResolvedAbilityEffectGroup,
} from "../ability-display/abilityDisplay.types";
import { resolveBlueprintById, resolveNonBlankText } from "../selectionUtils";
import { buildNextCycleHeaderLines } from "./nextCycleHeaderLines";

export const resolveNextCycleEffectGroups = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
    groups: AbilityEffectGroup[],
    ticksRemaining: number | null,
): ResolvedAbilityEffectGroup[] => {
    const sourceBlueprint = resolveBlueprintById(runtime, entity.blueprintId);
    const conversions = sourceBlueprint?._editor?.abilities?.conversion ?? [];

    return groups.map((group) => {
        const title =
            group.kind === "conversion" && typeof group.sourceIndex === "number"
                ? (() => {
                      const authoredId =
                          conversions[group.sourceIndex]?.id?.trim();
                      return authoredId && authoredId !== "default"
                          ? authoredId
                          : group.title;
                  })()
                : group.title;
        const effects =
            group.kind === "transform"
                ? group.effects.map((effect) => {
                      const blueprint = resolveBlueprintById(
                          runtime,
                          effect.label,
                      );
                      const display = blueprint?.components?.display as any;
                      return {
                          ...effect,
                          iconId:
                              resolveNonBlankText(display?.display_key) ??
                              effect.iconId,
                          label:
                              resolveNonBlankText(display?.label) ??
                              effect.label,
                      };
                  })
                : group.effects;
        return {
            id: group.id,
            title,
            headerLines: buildNextCycleHeaderLines(
                { ...group, title, effects },
                ticksRemaining,
            ),
            effects,
        };
    });
};

import type {
    BehaviorAction,
    BehaviorRule,
} from "../../../../../data/schemas/behavior";
import type {
    AbilityEffectGroup,
    AbilityEffectModel,
} from "../ability-display/abilityDisplay.types";

export const ensureGroup = (
    groups: AbilityEffectGroup[],
    kind: AbilityEffectGroup["kind"],
    title: string,
) => {
    const existing = groups.find((entry) => entry.kind === kind);
    if (existing) return existing;
    const created = {
        id: kind,
        kind,
        title,
        effects: [],
    } as AbilityEffectGroup;
    groups.push(created);
    return created;
};

export const buildDraftEffects = (rule: BehaviorRule) =>
    rule.actions.flatMap((action) =>
        action.type === "TRIGGER_DRAFT"
            ? [
                  {
                      id: `${rule.id}:${action.poolId}`,
                      iconId: "unknown",
                      label: action.label?.trim() || action.poolId,
                      valueText:
                          action.count && action.count > 1
                              ? `x${action.count}`
                              : "Unlock",
                      tone: "neutral",
                      tooltipTitle: "Unlocks draft on cycle completion",
                      tooltipLines: [
                          `Pool: ${action.poolId}`,
                          `Count: ${action.count ?? 1}`,
                      ],
                  } satisfies AbilityEffectModel,
              ]
            : [],
    );

export const buildTransformGroup = (rule: BehaviorRule) => {
    const effects = rule.actions.flatMap((action: BehaviorAction) =>
        action.type === "PATCH_BLUEPRINT"
            ? [
                  {
                      id: `${rule.id}:${action.blueprintId}`,
                      iconId: "unknown",
                      label: action.blueprintId,
                      valueText: "Transform",
                      tone: "neutral",
                      tooltipTitle: "Transforms on cycle completion",
                      tooltipLines: [action.blueprintId],
                  } as AbilityEffectModel,
              ]
            : [],
    );
    return effects.length > 0
        ? ({
              id: rule.id,
              kind: "transform",
              title: "Transform",
              effects,
          } as AbilityEffectGroup)
        : null;
};

import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import type { PowerJobCardData } from "../job-card/jobCardTypes";
import { resolveNextCycleEffectGroups } from "../job-card/resolveNextCycleEffectGroups";
import type { CardSectionModel, ValueCapsuleModel } from "./cardDisplayTypes";

export const resolveNextCycleSections = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
    groups: PowerJobCardData["analysis"]["nextCycleGroups"],
): CardSectionModel[] =>
    resolveNextCycleEffectGroups(entity, runtime, groups, null).map(
        (group) => ({
            id: group.id,
            title: group.title,
            layout: "wrap",
            density: "tight",
            capsules: group.effects.map((effect) => ({
                id: effect.id,
                skin: effect.tone === "negative" ? "warning" : "value",
                iconId: effect.iconId,
                title: effect.label,
                value: { text: effect.valueText },
                effects: [],
                tooltip: {
                    title: effect.tooltipTitle,
                    lines: effect.tooltipLines,
                },
            })),
        }),
    );

export const resolveSuspiciousBadges = (
    data: PowerJobCardData,
    entityId: string,
): ValueCapsuleModel[] | undefined =>
    data.suspiciousActivity
        ? [
              {
                  id: `${entityId}:suspicious`,
                  skin: "danger",
                  value: { text: data.suspiciousActivity.text },
                  effects: [],
                  tooltip: {
                      title: data.suspiciousActivity.tooltipTitle,
                      lines: data.suspiciousActivity.tooltipLines,
                  },
              },
          ]
        : undefined;

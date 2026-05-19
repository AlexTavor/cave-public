import { formatCompactNumber } from "../../../status/formatters";
import type { PowerJobCardData } from "../job-card/jobCardTypes";
import type { CardSectionModel, ValueCapsuleModel } from "./cardDisplayTypes";

const POWER_ATTRS = [
    { key: "body", label: "Body", iconId: "attr_body" },
    { key: "mind", label: "Mind", iconId: "attr_mind" },
    { key: "social", label: "Social", iconId: "attr_social" },
] as const;

export const resolvePowerUsageSection = (
    data: PowerJobCardData,
    entityId: string,
): CardSectionModel | null => {
    const capsules: ValueCapsuleModel[] = POWER_ATTRS.flatMap(
        ({ key, label, iconId }) => {
            const demand = data.sink.baseDemand ?? data.sink.maxDemand ?? {};
            const max = demand[key] ?? 0;
            return max > 0
                ? [{
                    id: `${entityId}:power:${key}`,
                    skin: "value",
                    iconId,
                    title: label,
                    value: {
                        binding: {
                            id: `${entityId}:power:${key}:value`,
                            kind: "numeric-text",
                            entityId,
                            valuePath: "powerSink.efficiency",
                            format: "compact-number",
                            multiplier: max,
                        },
                        maxText: formatCompactNumber(max),
                    },
                    effects: [],
                    testId: `power-${key}`,
                }]
                : [];
        },
    );
    return capsules.length
        ? {
              id: `${entityId}:power`,
              title: "Power Usage",
              layout: "column",
              density: "normal",
              capsules,
          }
        : null;
};

export const resolveCycleSection = (
    data: PowerJobCardData,
    entityId: string,
): CardSectionModel | null =>
    data.analysis.cycleCurrent === null || data.analysis.cycleMax === null
        ? null
        : {
              id: `${entityId}:cycle`,
              title: "Cycle",
              layout: "wrap",
              density: "tight",
              capsules: [
                  {
                      id: `${entityId}:cycle:value`,
                      skin: "value",
                      iconId: "activity",
                      title: "Progress",
                      value: {
                          binding: {
                              id: `${entityId}:cycle:value:text`,
                              kind: "compact-fraction",
                              entityId,
                              valuePath: "state.cycle.value",
                              maxPath: "state.cycle.max",
                          },
                      },
                      effects: [],
                  },
                  {
                      id: `${entityId}:cycle:time`,
                      skin: "plain",
                      title: "Time",
                      value: {
                          binding: {
                              id: `${entityId}:cycle:time:text`,
                              kind: "cycle-countdown",
                              entityId,
                          },
                      },
                      effects: [],
                  },
              ],
          };
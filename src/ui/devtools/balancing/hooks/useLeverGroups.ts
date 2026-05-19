import { useMemo } from "react";
import type {
    LeverDefinition,
    LeverType,
} from "../../../../engine/balancing/Scanner";

const getSubGroupKey = (lever: LeverDefinition): string => {
    if (lever.type === "setting") {
        return lever.path.split(".")[2] ?? "settings";
    }
    return lever.blueprintId ?? "unknown";
};

export const useLeverGroups = (
    levers: LeverDefinition[],
    query: string,
): Record<LeverType, Record<string, LeverDefinition[]>> =>
    useMemo(() => {
        const needle = query.trim().toLowerCase();
        const filtered = needle
            ? levers.filter((lever) =>
                  `${lever.label} ${lever.path}`.toLowerCase().includes(needle),
              )
            : levers;

        const grouped: Record<LeverType, Record<string, LeverDefinition[]>> = {
            setting: {},
            state: {},
            behavior: {},
        };

        for (const lever of filtered) {
            const key = getSubGroupKey(lever);
            grouped[lever.type][key] ??= [];
            grouped[lever.type][key].push(lever);
        }

        return grouped;
    }, [levers, query]);

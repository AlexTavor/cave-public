import React, { useMemo } from "react";
import type {
    DraftOptionBlueprint,
    DraftPoolEntry,
} from "../../../../../data/schemas/draft";
import { Bar, EmptySegment, Segment } from "./DistributionBar.styles";

interface DistributionBarProps {
    entries: DraftPoolEntry[];
    options: Record<string, DraftOptionBlueprint>;
}

const getTone = (option?: DraftOptionBlueprint): string => {
    if (!option) return "none";
    return option.rarity ?? "none";
};

export const DistributionBar: React.FC<DistributionBarProps> = ({
    entries,
    options,
}) => {
    const total = useMemo(
        () => entries.reduce((sum, entry) => sum + entry.weight, 0),
        [entries],
    );

    if (entries.length === 0 || total <= 0) {
        return (
            <Bar>
                <EmptySegment />
            </Bar>
        );
    }

    return (
        <Bar>
            {entries.map((entry) => {
                const option = options[entry.optionId];
                const width = (entry.weight / total) * 100;
                const tone = getTone(option);
                const percent = Math.round((entry.weight / total) * 100);

                return (
                    <Segment
                        key={`${entry.optionId}-${entry.weight}`}
                        tone={tone}
                        width={width}
                        title={`${entry.optionId} — ${percent}%`}
                    />
                );
            })}
        </Bar>
    );
};

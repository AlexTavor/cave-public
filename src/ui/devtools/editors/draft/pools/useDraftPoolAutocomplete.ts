import { useMemo } from "react";
import type { Suggestion } from "../../../../../lib/terminal/types";
import type { DraftOptionBlueprint } from "../../../../../data/schemas/draft";

const getCurrentToken = (value: string): string => value.trim();

export const useDraftPoolAutocomplete = (
    input: string,
    options: Record<string, DraftOptionBlueprint>,
    addedIds: ReadonlySet<string> = new Set(),
): Suggestion[] => {
    return useMemo(() => {
        const current = getCurrentToken(input).toLowerCase();
        const entries = Object.values(options);
        return entries
            .filter((option) => !addedIds.has(option.id))
            .filter((option) =>
                [option.id, option.title]
                    .join(" ")
                    .toLowerCase()
                    .includes(current),
            )
            .slice(0, 8)
            .map((option) => ({
                label: `${option.id} — ${option.title}`,
                type: "argument",
                insertText: option.id,
            }));
    }, [input, options, addedIds]);
};

import type { HabitiDisplayEntry } from "../../../../../game/habiti/resolveHabitiDisplayEntries";
import type { CapsuleSkin, ValueCapsuleModel } from "./cardDisplayTypes";

const toTooltip = (entry: HabitiDisplayEntry) => {
    const lines = [entry.description, ...entry.effectDescriptions].filter(
        Boolean,
    );
    return lines.length ? { title: entry.label, lines } : undefined;
};

export const adaptHabitiEntriesToCapsules = (
    entries: HabitiDisplayEntry[],
    resolveSkin: (entry: HabitiDisplayEntry) => CapsuleSkin,
): ValueCapsuleModel[] =>
    entries.map((entry) => ({
        id: entry.id,
        skin: resolveSkin(entry),
        value: { text: entry.label },
        effects: [],
        suffix: entry.summary || undefined,
        tooltip: toTooltip(entry),
    }));

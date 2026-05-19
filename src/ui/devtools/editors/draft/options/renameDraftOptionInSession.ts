import type { ModuleCartridge } from "../../../../../data/schemas/module";

interface RenameDraftOptionInSessionArgs {
    draft: ModuleCartridge;
    oldId: string;
    newId: string;
}

export const renameDraftOptionInSession = ({
    draft,
    oldId,
    newId,
}: RenameDraftOptionInSessionArgs): string | null => {
    const trimmed = newId.trim();
    if (!trimmed) {
        return "Option ID cannot be empty.";
    }
    if (trimmed === oldId) {
        return null;
    }

    const options = draft.draftOptions ?? {};
    if (options[trimmed]) {
        return `Option ID '${trimmed}' already exists.`;
    }

    const option = options[oldId];
    if (!option) {
        return "Draft option not found.";
    }

    const next = { ...options };
    delete next[oldId];
    next[trimmed] = { ...option, id: trimmed };
    draft.draftOptions = next;

    const pools = draft.draftPools ?? {};
    for (const pool of Object.values(pools)) {
        pool.entries = pool.entries.map((entry) =>
            entry.optionId === oldId ? { ...entry, optionId: trimmed } : entry,
        );
    }

    return null;
};

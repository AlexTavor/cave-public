import { useCallback } from "react";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { useSessionStore } from "../../../state/useSessionStore";
import { useToastStore } from "../../../toast/toastStore";
import type { ConditionDefinition } from "../../../../../data/schemas/conditions";
import { createDefaultConditionDefinition } from "./conditionEditorDefaults";

const PATH = "config.settings.conditions";
const EMPTY_CONDITIONS: ConditionDefinition[] = [];

const readItems = (draft: unknown) =>
    (
        (getByPath(draft, PATH) as ConditionDefinition[] | undefined) ?? []
    ).slice();

export const useConditionDefinitionsSession = (filename: string) => {
    const rawItems = useSessionStore(
        (state) =>
            getByPath(state.sessions[filename]?.draft, PATH) as
                | ConditionDefinition[]
                | undefined,
    );
    const items = rawItems ?? EMPTY_CONDITIONS;
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const pushToast = useToastStore((state) => state.push);
    const update = useCallback(
        (updater: (current: ConditionDefinition[]) => ConditionDefinition[]) =>
            updateDraft(filename, (draft) =>
                setByPath(draft, PATH, updater(readItems(draft))),
            ),
        [filename, updateDraft],
    );
    const rename = (index: number, id: string) => {
        const nextId = id.trim();
        if (!nextId) return "empty";
        if (items.some((item, i) => i !== index && item.id === nextId)) {
            pushToast("error", `ID "${nextId}" already exists.`);
            return "duplicate";
        }
        update((current) =>
            current.map((item, i) =>
                i === index ? { ...item, id: nextId } : item,
            ),
        );
        return null;
    };

    return {
        items,
        add: () =>
            update((current) => [
                ...current,
                createDefaultConditionDefinition(
                    `condition_${current.length + 1}`,
                ),
            ]),
        remove: (index: number) =>
            update((current) => current.filter((_, i) => i !== index)),
        rename,
    };
};

import { useCallback } from "react";
import {
    getByPath,
    setByPath,
    deleteByPath,
} from "../../../../../../utils/objectUtils";
import { useSessionStore } from "../../../../state/useSessionStore";
import { useBlueprintTagSuggestions } from "../../hooks/useBlueprintTagSuggestions";

type ParentKind = "entity_id" | "entity_tag";

const DEFAULT_PARENT = { kind: "entity_tag" as const, tag: "" };

export const usePassportParentField = (filename: string, basePath: string) => {
    const parentPath = `${basePath}.parent`;
    const kind = useSessionStore(
        useCallback(
            (state) =>
                (getByPath(
                    state.sessions[filename]?.draft,
                    `${parentPath}.kind`,
                ) as ParentKind | undefined) ?? null,
            [filename, parentPath],
        ),
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const tagSuggestions = useBlueprintTagSuggestions(filename);

    const addParent = () => {
        updateDraft(filename, (draft) =>
            setByPath(draft, parentPath, DEFAULT_PARENT),
        );
    };

    const removeParent = () => {
        updateDraft(filename, (draft) => deleteByPath(draft, parentPath));
    };

    const handleKindChange = (nextKind: string) => {
        updateDraft(filename, (draft) => {
            setByPath(
                draft,
                parentPath,
                nextKind === "entity_id"
                    ? { kind: "entity_id", entityId: "" }
                    : DEFAULT_PARENT,
            );
        });
    };

    return {
        addParent,
        removeParent,
        handleKindChange,
        hasParent: kind !== null,
        kind,
        parentPath,
        tagSuggestions,
    };
};

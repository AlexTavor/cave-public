import React, { useCallback } from "react";
import { useSessionStore } from "../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../utils/objectUtils";
import { ToolFrame } from "../../../lib/atoms/tool-frame";
import { Button } from "../../../lib/atoms/button";
import { useToastStore } from "../../toast/toastStore";
import { TraitRowEditor } from "./traits/TraitRowEditor";
import { useStateSuggestions } from "./traits/useStateSuggestions";
import { REGISTRY_PATH, AddArea, EmptyMsg } from "./TraitsEditor.styles";
import type { TraitDefinition } from "../../../../data/schemas/game/traits";

const EMPTY_TRAITS: Record<string, TraitDefinition> = {};

interface TraitsEditorProps {
    filename: string;
}

export const TraitsEditor: React.FC<TraitsEditorProps> = ({ filename }) => {
    const traits = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return EMPTY_TRAITS;
                return (
                    (getByPath(session.draft, REGISTRY_PATH) as Record<
                        string,
                        TraitDefinition
                    >) ?? EMPTY_TRAITS
                );
            },
            [filename],
        ),
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const suggestions = useStateSuggestions(filename);
    const pushToast = useToastStore((s) => s.push);

    const traitIds = Object.keys(traits);

    const handleAdd = () => {
        const newId = `trait-${Date.now().toString(36)}`;
        updateDraft(filename, (draft) => {
            const current =
                (getByPath(draft, REGISTRY_PATH) as Record<
                    string,
                    TraitDefinition
                >) ?? {};
            setByPath(draft, REGISTRY_PATH, {
                ...current,
                [newId]: { id: newId, label: "New Trait" },
            });
        });
        pushToast("success", `Trait "${newId}" added.`);
    };

    const handleDelete = (traitId: string) => {
        updateDraft(filename, (draft) => {
            const current =
                (getByPath(draft, REGISTRY_PATH) as Record<
                    string,
                    TraitDefinition
                >) ?? {};
            const next = { ...current };
            delete next[traitId];
            setByPath(draft, REGISTRY_PATH, next);
        });
        pushToast("info", `Trait "${traitId}" removed.`);
    };

    const handleRename = (oldId: string, newId: string): string | null => {
        if (newId in traits) {
            pushToast("error", `ID "${newId}" already exists.`);
            return "duplicate";
        }
        updateDraft(filename, (draft) => {
            const current =
                (getByPath(draft, REGISTRY_PATH) as Record<
                    string,
                    TraitDefinition
                >) ?? {};
            const { [oldId]: data, ...rest } = current;
            setByPath(draft, REGISTRY_PATH, {
                ...rest,
                [newId]: { ...data, id: newId },
            });
        });
        pushToast("success", `Renamed "${oldId}" → "${newId}".`);
        return null;
    };

    return (
        <ToolFrame title="Global Traits">
            {traitIds.length === 0 && (
                <EmptyMsg>No traits defined yet.</EmptyMsg>
            )}
            {traitIds.map((traitId) => (
                <TraitRowEditor
                    key={traitId}
                    filename={filename}
                    traitId={traitId}
                    registryPath={REGISTRY_PATH}
                    onDelete={() => handleDelete(traitId)}
                    onRename={handleRename}
                    suggestions={suggestions}
                />
            ))}
            <AddArea>
                <Button size="sm" variant="ghost" onClick={handleAdd}>
                    + Add Trait
                </Button>
            </AddArea>
        </ToolFrame>
    );
};

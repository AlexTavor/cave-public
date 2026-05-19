import React, { useMemo, useState } from "react";
import { BlueprintEditor } from "../blueprint/editor/BlueprintEditor";
import {
    useEnsureModuleSession,
    useModuleSession,
} from "../../state/moduleSession";
import { useSessionStore } from "../../state/useSessionStore";

interface BlueprintFileEditorProps {
    filename: string;
}

const getFirstBlueprintId = (filename: string, draft: unknown) => {
    const blueprints = (draft as any)?.blueprints as Record<string, unknown>;
    if (!blueprints || typeof blueprints !== "object") return null;
    return (
        Object.keys(blueprints)[0] ??
        filename.replace(/^.*\//, "").replace(/\.bp$/i, "")
    );
};

export const BlueprintFileEditor: React.FC<BlueprintFileEditorProps> = ({
    filename,
}) => {
    useEnsureModuleSession(filename);
    const session = useModuleSession(filename);
    const updateDraft = useSessionStore((s) => s.updateDraft);
    const [id, setId] = useState("");
    const [label, setLabel] = useState("");

    const blueprintId = useMemo(
        () =>
            session.draft ? getFirstBlueprintId(filename, session.draft) : null,
        [filename, session.draft],
    );

    if (!session.isReady) return <div>Loading...</div>;

    if (!blueprintId) {
        return (
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    const nextId = id.trim();
                    if (!nextId) return;
                    const nextLabel = label.trim() || nextId;
                    updateDraft(filename, (draft) => {
                        draft.blueprints ??= {};
                        draft.blueprints[nextId] = {
                            id: nextId,
                            label: nextLabel,
                            tags: [],
                            components: {
                                display: { label: nextLabel, icon: "unknown" },
                            },
                        } as any;
                    });
                }}
            >
                <input
                    placeholder="Blueprint ID"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                />
                <input
                    placeholder="Label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                />
                <button type="submit">Create</button>
            </form>
        );
    }

    return <BlueprintEditor filename={filename} blueprintId={blueprintId} />;
};

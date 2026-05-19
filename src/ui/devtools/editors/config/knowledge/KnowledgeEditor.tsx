import React from "react";
import { Button } from "../../../../lib/atoms/button";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { useEnsureModuleSession } from "../../../state/moduleSession";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { KnowledgeRow } from "./KnowledgeRow";

const PATH = "config.settings.knowledge";

export const KnowledgeEditor: React.FC<{ filename: string }> = ({
    filename,
}) => {
    useEnsureModuleSession(filename);
    const items = useSessionStore(
        (state) =>
            (getByPath(state.sessions[filename]?.draft, PATH) as any[]) ?? [],
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const remove = (index: number) =>
        updateDraft(filename, (draft) =>
            setByPath(
                draft,
                PATH,
                items.filter((_, i) => i !== index),
            ),
        );
    const add = () =>
        updateDraft(filename, (draft) =>
            setByPath(draft, PATH, [
                ...items,
                {
                    id: `codex_${items.length + 1}`,
                    label: "New Codex Entry",
                    description: "",
                    guidanceId: "",
                    unlockConditionIds: [],
                },
            ]),
        );

    return (
        <ToolFrame title="Codex Editor">
            {items.map((item, index) => (
                <KnowledgeRow
                    key={item.id ?? index}
                    filename={filename}
                    index={index}
                    item={item}
                    onDelete={() => remove(index)}
                />
            ))}
            <SmartTooltip content="Create a codex entry backed by a guidance.">
                <Button size="sm" variant="ghost" onClick={add}>
                    + Add Codex Entry
                </Button>
            </SmartTooltip>
        </ToolFrame>
    );
};

import React, { useMemo } from "react";
import { Button } from "../../../lib/atoms/button";
import { SmartTooltip } from "../../../lib/atoms/tooltip";
import { getByPath, setByPath } from "../../../../utils/objectUtils";
import { useSessionStore } from "../../state/useSessionStore";
import { useShellStore } from "../../shell/shell";
import { ConditionReferenceRow } from "./ConditionReferenceRow";

const EMPTY_ITEMS: string[] = [];
const EMPTY_CONDITION_DEFS: { id: string }[] = [];

export const ConditionReferenceList: React.FC<{
    filename: string;
    path: string;
    label: string;
}> = ({ filename, path, label }) => {
    const rawItems = useSessionStore(
        (state) =>
            getByPath(state.sessions[filename]?.draft, path) as
                | string[]
                | undefined,
    );
    const rawConditionDefs = useSessionStore(
        (state) =>
            getByPath(
                state.sessions[filename]?.draft,
                "config.settings.conditions",
            ) as { id: string }[] | undefined,
    );
    const items = rawItems ?? EMPTY_ITEMS;
    const conditionDefs = rawConditionDefs ?? EMPTY_CONDITION_DEFS;
    const suggestions = useMemo(
        () => conditionDefs.map((item) => item.id),
        [conditionDefs],
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const openFile = useShellStore((state) => state.openFile);
    const update = (next: string[]) =>
        updateDraft(filename, (draft) => setByPath(draft, path, next));

    return (
        <div>
            <SmartTooltip content="Open the Conditions Editor for this file.">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openFile(`conditions::${filename}`)}
                >
                    {label}
                </Button>
            </SmartTooltip>
            {items.map((_, index) => (
                <ConditionReferenceRow
                    key={`${path}.${index}`}
                    filename={filename}
                    path={`${path}.${index}`}
                    suggestions={suggestions}
                    onRemove={() =>
                        update(items.filter((__, i) => i !== index))
                    }
                />
            ))}
            <SmartTooltip content="Add another condition reference.">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update([...items, ""])}
                >
                    + Add Condition Ref
                </Button>
            </SmartTooltip>
        </div>
    );
};

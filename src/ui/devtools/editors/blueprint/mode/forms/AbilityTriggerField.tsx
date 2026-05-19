import React from "react";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";
import {
    Checkbox,
    CursorLabel,
} from "../../../fields/boolean-field/BooleanField.styles";
import { useSessionStore } from "../../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";

const OPTIONS = ["cycle_complete", "assignment_complete"] as const;
const DEFAULT_TRIGGERS = ["cycle_complete"];

export const AbilityTriggerField: React.FC<{
    filename: string;
    path: string;
}> = ({ filename, path }) => {
    const triggers = useSessionStore((state) => {
        const value = getByPath(state.sessions[filename]?.draft, path);
        return Array.isArray(value) ? value : DEFAULT_TRIGGERS;
    });
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const toggle = (trigger: (typeof OPTIONS)[number]) => {
        const next = triggers.includes(trigger)
            ? triggers.filter((value) => value !== trigger)
            : [...triggers, trigger];
        updateDraft(filename, (draft) =>
            setByPath(draft, path, next.length > 0 ? next : ["cycle_complete"]),
        );
    };

    return (
        <div>
            <SmartTooltip content="Choose whether this ability runs on cycle completion, assignment completion, or either.">
                <CursorLabel>Triggers</CursorLabel>
            </SmartTooltip>
            {OPTIONS.map((trigger) => (
                <CursorLabel key={trigger}>
                    <Checkbox
                        type="checkbox"
                        checked={triggers.includes(trigger)}
                        onChange={() => toggle(trigger)}
                    />
                    {trigger}
                </CursorLabel>
            ))}
        </div>
    );
};

import React from "react";
import { Button } from "../../../../lib/atoms/button";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { useSessionStore } from "../../../state/useSessionStore";
import { AutocompleteStringField } from "../../fields/string-field/AutocompleteStringField";
import {
    guidanceAttentionSchema,
    guidanceStringSchema,
} from "./guidanceFieldSchemas";

export const GuidanceAttentionList: React.FC<{
    filename: string;
    path: string;
    suggestions: string[];
}> = ({ filename, path, suggestions }) => {
    const items = useSessionStore(
        (state) =>
            (getByPath(state.sessions[filename]?.draft, path) as string[]) ??
            [],
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const update = (next: string[]) =>
        updateDraft(filename, (draft) => setByPath(draft, path, next));

    return (
        <div>
            {items.map((_, index) => (
                <div key={`${path}.${index}`}>
                    <AutocompleteStringField
                        label="Attention"
                        schema={guidanceStringSchema}
                        filename={filename}
                        path={`${path}.${index}`}
                        suggestions={suggestions}
                    />
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                            update(items.filter((__, i) => i !== index))
                        }
                    >
                        Remove Attention
                    </Button>
                </div>
            ))}
            <SmartTooltip
                content={`Available: ${guidanceAttentionSchema.options.join(", ")}`}
            >
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update([...items, "stop_time"])}
                >
                    + Add Attention
                </Button>
            </SmartTooltip>
        </div>
    );
};

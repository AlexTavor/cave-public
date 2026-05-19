import React from "react";
import { SmartInput } from "../../../../../lib/terminal/components/SmartInput";
import { Button } from "../../../../lib/atoms/button/Button";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import type { DraftOptionBlueprint } from "../../../../../data/schemas/draft";
import { useDraftPoolAutocomplete } from "./useDraftPoolAutocomplete";
import { AddRow, ErrorText, InputContainer } from "./AddEntryInput.styles";

interface AddEntryInputProps {
    value: string;
    options: Record<string, DraftOptionBlueprint>;
    addedIds: ReadonlySet<string>;
    error?: string | null;
    onChange: (value: string) => void;
    onSubmit: (value: string) => void;
    onCreate: () => void;
}

export const AddEntryInput: React.FC<AddEntryInputProps> = ({
    value,
    options,
    addedIds,
    error,
    onChange,
    onSubmit,
    onCreate,
}) => {
    const suggestions = useDraftPoolAutocomplete(value, options, addedIds);

    const handleSubmit = (nextValue: string) => {
        const trimmed = nextValue.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
    };

    return (
        <div>
            <AddRow>
                <InputContainer>
                    <SmartInput
                        value={value}
                        suggestions={suggestions}
                        onChange={onChange}
                        onSubmit={handleSubmit}
                        promptLabel=""
                        placeholder="Add option id..."
                    />
                </InputContainer>
                <SmartTooltip content="Add an existing draft option to this pool">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSubmit(value)}
                    >
                        Add
                    </Button>
                </SmartTooltip>
                <SmartTooltip content="Create a new draft option and add it to the pool">
                    <Button size="sm" variant="ghost" onClick={onCreate}>
                        Create
                    </Button>
                </SmartTooltip>
            </AddRow>
            {error && <ErrorText>{error}</ErrorText>}
        </div>
    );
};

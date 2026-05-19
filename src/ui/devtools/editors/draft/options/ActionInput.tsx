import React, { useState } from "react";
import { SmartInput } from "../../../../../lib/terminal/components/SmartInput";
import { Button } from "../../../../lib/atoms/button/Button";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import {
    ErrorText,
    HelperText,
    InputContainer,
    InputRow,
} from "./ActionInput.styles";
import { useActionAutocomplete } from "./useActionAutocomplete";

export interface ActionInputProps {
    value: string;
    onChange: (val: string) => void;
    onCommit: (val: string) => void;
    error?: string | null;
}

export const ActionInput: React.FC<ActionInputProps> = ({
    value,
    onChange,
    onCommit,
    error,
}) => {
    const [cursor, setCursor] = useState(0);
    const suggestions = useActionAutocomplete(value, cursor);

    const handleSubmit = (nextValue: string) => {
        const trimmed = nextValue.trim();
        if (!trimmed) return;
        onCommit(trimmed);
    };

    return (
        <div>
            <InputRow>
                <InputContainer>
                    <SmartInput
                        value={value}
                        suggestions={suggestions}
                        onChange={onChange}
                        onSubmit={handleSubmit}
                        onCursorChange={setCursor}
                        promptLabel=""
                        placeholder='SET self.state.hp.value 5 AND SHOW_CINEMATIC "Line 1", "Line 2"'
                    />
                </InputContainer>
                <SmartTooltip content="Parse and add this action to the payload">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSubmit(value)}
                    >
                        Add
                    </Button>
                </SmartTooltip>
            </InputRow>
            <HelperText>
                Action verbs: SET|ADD|SUB, TRANSFER, DISPATCH, SPAWN, KILL,
                ADD_TRAIT, REMOVE_TRAIT, SHOW_CINEMATIC. Use SHOW_CINEMATIC
                "Line 1", "Line 2" and join actions with AND.
            </HelperText>
            {error && <ErrorText>{error}</ErrorText>}
        </div>
    );
};


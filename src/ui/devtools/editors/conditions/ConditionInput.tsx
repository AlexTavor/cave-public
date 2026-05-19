import React, { useState } from "react";
import { SmartInput } from "../../../../lib/terminal/components/SmartInput";
import { useConditionAutocomplete } from "./useConditionAutocomplete";
import { ErrorText, InputContainer, InputRow } from "./ConditionInput.styles";

export interface ConditionInputProps {
    value: string;
    onChange: (next: string) => void;
    error?: string | null;
    placeholder?: string;
}

export const ConditionInput: React.FC<ConditionInputProps> = ({
    value,
    onChange,
    error,
    placeholder = "self.state.foo > 5",
}) => {
    const [cursor, setCursor] = useState(0);
    const suggestions = useConditionAutocomplete(value, cursor);

    return (
        <div style={{ width: "100%" }}>
            <InputRow>
                <InputContainer>
                    <SmartInput
                        value={value}
                        suggestions={suggestions}
                        onChange={onChange}
                        onSubmit={onChange}
                        onCursorChange={setCursor}
                        promptLabel=""
                        placeholder={placeholder}
                    />
                </InputContainer>
            </InputRow>
            {error ? <ErrorText>{error}</ErrorText> : null}
        </div>
    );
};

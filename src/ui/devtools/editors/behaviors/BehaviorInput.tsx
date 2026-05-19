import React, { useEffect, useState } from "react";
import { Button } from "../../../lib/atoms/button/Button";
import { SmartInput } from "../../../../lib/terminal/components/SmartInput";
import {
    ErrorText,
    HelperText,
    InputContainer,
    InputRow,
} from "./BehaviorInput.styles";
import { useBehaviorAutocomplete } from "./autocomplete/useBehaviorAutocomplete";

export interface BehaviorInputProps {
    onSubmit: (value: string) => void;
    error?: string | null;
    initialValue?: string;
    submitLabel?: string;
    onValueChange?: (value: string) => void;
}

export const BehaviorInput: React.FC<BehaviorInputProps> = ({
    onSubmit,
    error,
    initialValue,
    submitLabel = "Add",
    onValueChange,
}) => {
    const [value, setValue] = useState(initialValue ?? "");
    const [cursor, setCursor] = useState(0);
    const suggestions = useBehaviorAutocomplete(value, cursor);

    useEffect(() => {
        if (initialValue === undefined) return;
        setValue(initialValue);
    }, [initialValue]);

    const handleSubmit = (nextValue: string): void => {
        const normalized = nextValue.trim();
        if (!normalized) return;
        onSubmit(normalized);
        if (initialValue === undefined) {
            setValue("");
            onValueChange?.("");
        }
    };

    const handleButtonClick = (): void => {
        handleSubmit(value);
    };

    return (
        <div>
            <InputRow>
                <InputContainer>
                    <SmartInput
                        value={value}
                        suggestions={suggestions}
                        onChange={(nextValue) => {
                            setValue(nextValue);
                            onValueChange?.(nextValue);
                        }}
                        onSubmit={handleSubmit}
                        onCursorChange={setCursor}
                        promptLabel=""
                        placeholder="WHEN self.state.hp.value < 10 DO SPAWN ghost AND KILL self"
                    />
                </InputContainer>
                <Button size="sm" variant="ghost" onClick={handleButtonClick}>
                    {submitLabel}
                </Button>
            </InputRow>
            <HelperText>
                Grammar: WHEN &lt;condition&gt; [AND &lt;condition&gt;...] DO
                SET|ADD|SUB &lt;target&gt; &lt;value&gt; OR TRANSFER
                &lt;amount&gt; &lt;resource&gt; FROM &lt;source&gt; TO
                &lt;target&gt; OR SPAWN|KILL &lt;id&gt; [AND &lt;action&gt;...].
            </HelperText>
            {error && <ErrorText>{error}</ErrorText>}
        </div>
    );
};

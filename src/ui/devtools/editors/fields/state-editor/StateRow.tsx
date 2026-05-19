import React from "react";
import { Button } from "../../../../lib/atoms/button/Button";
import { KeyText, Row, ValueInput } from "./StateEditor.styles";
import { useStateRow } from "./useStateRow";

export interface StateRowProps {
    entryKey: string;
    value: number;
}

export const StateRow: React.FC<StateRowProps> = ({ entryKey, value }) => {
    const { draftValue, setDraftValue, removeEntry } = useStateRow({
        entryKey,
        value,
    });

    return (
        <Row>
            <KeyText title={entryKey}>{entryKey}</KeyText>
            <ValueInput
                type="number"
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
            />
            <Button size="sm" variant="ghost" onClick={removeEntry}>
                Delete
            </Button>
        </Row>
    );
};

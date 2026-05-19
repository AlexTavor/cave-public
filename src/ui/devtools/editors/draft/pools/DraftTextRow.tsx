import React, { useMemo } from "react";
import { Card } from "../../../../lib/atoms/card";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import { RichText } from "../../../../lib/atoms/rich-text/RichText";
import { FieldContainer, Label, TextArea } from "../../fields/Shared.styles";
import { useStringField } from "../../fields/string-field/useStringField";

interface DraftTextRowProps {
    filename: string;
    poolId: string;
    index: number;
    onRemove: () => void;
}

const summarize = (text: string) =>
    text
        .split("\n")
        .map((line) => line.trim())
        .find(Boolean) ?? "Empty";

export const DraftTextRow: React.FC<DraftTextRowProps> = ({
    filename,
    poolId,
    index,
    onRemove,
}) => {
    const path = `draftPools.${poolId}.texts.${index}`;
    const { localValue, setLocalValue, handleBlur } = useStringField(
        filename,
        path,
    );
    const summary = useMemo(() => summarize(localValue), [localValue]);

    return (
        <ComponentRow
            title={`Text #${index + 1}`}
            summary={summary}
            defaultOpen
            onDelete={onRemove}
            deleteLabel="Remove"
        >
            <FieldContainer>
                <Label>Raw Text</Label>
                <TextArea
                    value={localValue}
                    onChange={(event) => setLocalValue(event.target.value)}
                    onBlur={handleBlur}
                />
            </FieldContainer>
            <FieldContainer>
                <Label>Preview</Label>
                <Card variant="surface" padding="sm">
                    <RichText text={localValue || " "} />
                </Card>
            </FieldContainer>
        </ComponentRow>
    );
};

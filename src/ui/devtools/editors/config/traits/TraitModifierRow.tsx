import React from "react";
import { z } from "zod";
import styled from "@emotion/styled";
import { PassiveEffectSchema } from "../../../../../data/schemas/components";
import { AutocompleteStringField } from "../../fields/string-field/AutocompleteStringField";
import { NumberField } from "../../fields/number-field/NumberField";
import { EnumField } from "../../fields/enum-field/EnumField";

const STRING_SCHEMA = z.string();
const NUMBER_SCHEMA = z.number();

const FALLBACK_SUGGESTIONS = ["self.state.", "self.powerSink.baseDemand."];

const Card = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.06);
`;

interface TraitModifierRowProps {
    filename: string;
    basePath: string;
    suggestions?: string[];
}

export const TraitModifierRow: React.FC<TraitModifierRowProps> = ({
    filename,
    basePath,
    suggestions,
}) => {
    const effectiveSuggestions = suggestions?.length
        ? suggestions
        : FALLBACK_SUGGESTIONS;
    return (
        <Card>
            <EnumField
                label="Operation"
                filename={filename}
                path={`${basePath}.op`}
                schema={PassiveEffectSchema.shape.op}
                tooltip="How the modifier is applied: SET replaces, ADD/SUB adjusts, MULT/DIV scales."
            />
            <AutocompleteStringField
                label="Target"
                filename={filename}
                path={`${basePath}.target`}
                schema={STRING_SCHEMA}
                suggestions={effectiveSuggestions}
                tooltip="State field to modify (e.g. self.state.energy). The operation is applied here."
            />
            <AutocompleteStringField
                label="Source (optional)"
                filename={filename}
                path={`${basePath}.source`}
                schema={STRING_SCHEMA}
                suggestions={effectiveSuggestions}
                tooltip="Read the modifier amount from this state field instead of a fixed value."
            />
            <NumberField
                label="Value (optional)"
                filename={filename}
                path={`${basePath}.value`}
                schema={NUMBER_SCHEMA}
                tooltip="Fixed numeric amount to apply. Ignored if a source field is specified."
            />
        </Card>
    );
};

import React from "react";
import { EnumField } from "../../fields/enum-field/EnumField";
import { AutocompleteStringField } from "../../fields/string-field/AutocompleteStringField";
import {
    tutorialSelfKindSchema,
    tutorialStringSchema,
} from "./tutorialFieldSchemas";
import { useStructuredConditionTagSuggestions } from "../../conditions/structuredConditionAutocomplete";

const EMPTY_SUGGESTIONS: string[] = [];

export const TutorialSelfDefinitionField: React.FC<{
    filename: string;
    basePath: string;
    kind: string;
    autoSummary: string;
}> = ({ filename, basePath, kind, autoSummary }) => {
    const tagSuggestions = useStructuredConditionTagSuggestions(filename);

    return (
        <>
            <EnumField
                label={`Definition of Self (${autoSummary})`}
                schema={tutorialSelfKindSchema}
                filename={filename}
                path={`${basePath}.selfDefinition.kind`}
            />
            {kind === "entity_tag" || kind === "spawned_with_tag" ? (
                <AutocompleteStringField
                    label="Self Tag"
                    schema={tutorialStringSchema}
                    filename={filename}
                    path={`${basePath}.selfDefinition.tag`}
                    suggestions={tagSuggestions}
                />
            ) : null}
            {kind === "entity_id" ? (
                <AutocompleteStringField
                    label="Self ID"
                    schema={tutorialStringSchema}
                    filename={filename}
                    path={`${basePath}.selfDefinition.entityId`}
                    suggestions={EMPTY_SUGGESTIONS}
                />
            ) : null}
        </>
    );
};

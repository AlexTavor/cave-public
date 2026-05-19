import React from "react";
import { EnumField } from "../../fields/enum-field/EnumField";
import { AutocompleteStringField } from "../../fields/string-field/AutocompleteStringField";
import { useStructuredConditionTagSuggestions } from "../../conditions/structuredConditionAutocomplete";
import {
    tutorialSelfKindSchema,
    tutorialStringSchema,
} from "../tutorials/tutorialFieldSchemas";

const EMPTY_SUGGESTIONS: string[] = [];

export const ConditionSelfDefinitionField: React.FC<{
    filename: string;
    basePath: string;
    kind: string;
}> = ({ filename, basePath, kind }) => {
    const tagSuggestions = useStructuredConditionTagSuggestions(filename);
    return (
        <>
            <EnumField
                label="Definition of Self"
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

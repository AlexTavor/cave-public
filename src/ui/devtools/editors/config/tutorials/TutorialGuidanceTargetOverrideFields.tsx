import React from "react";
import { AutocompleteStringField } from "../../fields/string-field/AutocompleteStringField";
import { StringField } from "../../fields/string-field/StringField";
import { EnumField } from "../../fields/enum-field/EnumField";
import {
    tutorialStringSchema,
    tutorialTargetKindSchema,
} from "./tutorialFieldSchemas";

export const TutorialGuidanceTargetOverrideFields: React.FC<{
    filename: string;
    path: string;
    targetOverride: any;
    tags: string[];
}> = ({ filename, path, targetOverride, tags }) => {
    if (!targetOverride) return null;
    return (
        <>
            <EnumField
                label="Target Override Kind"
                schema={tutorialTargetKindSchema}
                filename={filename}
                path={`${path}.targetOverride.kind`}
                tooltip="Choose whether the override resolves by runtime entity id or entity tag."
            />
            {targetOverride.kind === "entity_tag" ? (
                <AutocompleteStringField
                    label="Target Override Tag"
                    schema={tutorialStringSchema}
                    filename={filename}
                    path={`${path}.targetOverride.tag`}
                    suggestions={tags}
                    tooltip="Resolve this guidance against the first runtime entity with the selected tag."
                />
            ) : (
                <StringField
                    label="Target Override ID"
                    schema={tutorialStringSchema}
                    filename={filename}
                    path={`${path}.targetOverride.entityId`}
                    tooltip="Force this guidance to target a specific runtime entity id."
                />
            )}
        </>
    );
};

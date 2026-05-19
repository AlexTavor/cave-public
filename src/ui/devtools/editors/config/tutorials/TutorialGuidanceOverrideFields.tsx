import React from "react";
import { StringField } from "../../fields/string-field/StringField";
import { tutorialStringSchema } from "./tutorialFieldSchemas";

export const TutorialGuidanceOverrideFields: React.FC<{
    filename: string;
    path: string;
    showTitleOverride: boolean;
    showTextOverride: boolean;
}> = ({ filename, path, showTitleOverride, showTextOverride }) => (
    <>
        {showTitleOverride ? (
            <StringField
                label="Title Override"
                schema={tutorialStringSchema}
                filename={filename}
                path={`${path}.titleOverride`}
                tooltip="Override the authored modal title for this tutorial use only."
            />
        ) : null}
        {showTextOverride ? (
            <StringField
                label="Text Override"
                schema={tutorialStringSchema}
                filename={filename}
                path={`${path}.textOverride`}
                tooltip="Override the authored guidance text for this tutorial use only."
            />
        ) : null}
    </>
);

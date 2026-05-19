import React from "react";
import { StringField } from "../../fields/string-field/StringField";
import { guidanceStringSchema } from "./guidanceFieldSchemas";

interface ModalGuidanceContentFieldsProps {
    filename: string;
    basePath: string;
}

export const ModalGuidanceContentFields: React.FC<
    ModalGuidanceContentFieldsProps
> = ({ filename, basePath }) => (
    <>
        <StringField
            label="Title"
            schema={guidanceStringSchema}
            filename={filename}
            path={`${basePath}.title`}
        />
        <StringField
            label="Text"
            schema={guidanceStringSchema}
            filename={filename}
            path={`${basePath}.text`}
            forceTextArea
        />
        <StringField
            label="Image URL"
            schema={guidanceStringSchema}
            filename={filename}
            path={`${basePath}.imageUrl`}
        />
    </>
);

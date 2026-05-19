import React from "react";
import { ToolFrame } from "../../../lib/atoms/tool-frame";
import { SchemaForm } from "../SchemaForm";
import { ImpulseConfigSchema } from "../../../../data/schemas/physics";
import { FormBody } from "./ImpulseSettingsEditor.styles.ts";

const IMPULSE_PATH = "config.settings.impulse";

interface ImpulseSettingsEditorProps {
    filename: string;
}

export const ImpulseSettingsEditor: React.FC<ImpulseSettingsEditorProps> = ({
    filename,
}) => {
    return (
        <ToolFrame title="Impulse Settings">
            <FormBody>
                <SchemaForm
                    schema={ImpulseConfigSchema}
                    filename={filename}
                    rootPath={IMPULSE_PATH}
                />
            </FormBody>
        </ToolFrame>
    );
};


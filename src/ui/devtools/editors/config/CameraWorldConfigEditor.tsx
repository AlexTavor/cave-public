import React from "react";
import { ToolFrame } from "../../../lib/atoms/tool-frame";
import { SchemaForm } from "../SchemaForm";
import { CameraWorldEditorSchema } from "../../../../data/schemas/game/cameraWorldConfig";

const CAMERA_WORLD_PATH = "config.settings.game_config";

interface CameraWorldConfigEditorProps {
    filename: string;
}

export const CameraWorldConfigEditor: React.FC<
    CameraWorldConfigEditorProps
> = ({ filename }) => {
    return (
        <ToolFrame title="Camera + World">
            <SchemaForm
                schema={CameraWorldEditorSchema}
                filename={filename}
                rootPath={CAMERA_WORLD_PATH}
            />
        </ToolFrame>
    );
};


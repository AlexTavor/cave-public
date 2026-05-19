import React from "react";
import { ToolFrame } from "../../../lib/atoms/tool-frame";
import { SchemaForm } from "../SchemaForm";
import { GameConfigSchema } from "../../../../data/schemas/game/config";
import { PurgeMilestonesEditor } from "./purge/PurgeMilestonesEditor";
import { SusDisplayEditor } from "./suspicion/SusDisplayEditor";
import { SuspicionNotificationDisplayEditor } from "./suspicion/SuspicionNotificationDisplayEditor";

const GAME_CONFIG_PATH = "config.settings.game_config";

interface GameConfigEditorProps {
    filename: string;
}

export const GameConfigEditor: React.FC<GameConfigEditorProps> = ({
    filename,
}) => {
    return (
        <ToolFrame title="Game Config">
            <SchemaForm
                schema={GameConfigSchema}
                filename={filename}
                rootPath={GAME_CONFIG_PATH}
            />
            <PurgeMilestonesEditor filename={filename} />
            <SusDisplayEditor filename={filename} />
            <SuspicionNotificationDisplayEditor filename={filename} />
        </ToolFrame>
    );
};


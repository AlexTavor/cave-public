import React from "react";
import { ToolFrame } from "../../../lib/atoms/tool-frame";
import { Card } from "../../../lib/atoms/card";
import { useShellStore } from "../../shell/shell";
import {
    DashboardGrid,
    CardTitle,
    CardDescription,
} from "../draft/DraftPackEditor.styles";

interface SystemConfigEditorProps {
    filename: string;
}

const buildCards = (filename: string) =>
    [
        [
            "Impulse Physics",
            "Tune simulation impulse forces.",
            `physics::${filename}`,
        ],
        [
            "Game Config",
            "Edit run-level configuration, progression, and world rules.",
            `game_config::${filename}`,
        ],
        [
            "World Entity",
            "Configure the sys_world entity definition.",
            `world_entity::${filename}`,
        ],
        [
            "Global Traits",
            "Edit the global traits registry.",
            `traits::${filename}`,
        ],
        [
            "Conditions",
            "Configure reusable authored condition definitions.",
            `conditions::${filename}`,
        ],
        [
            "Guidances",
            "Configure reusable guidance definitions and callout/modal content.",
            `guidances::${filename}`,
        ],
        [
            "Tutorials",
            "Configure concurrent tutorial composition over authored guidances.",
            `tutorials::${filename}`,
        ],
        [
            "Codex",
            "Configure codex entries that unlock authored guidances.",
            `knowledge::${filename}`,
        ],
        [
            "Understanding",
            "Edit the authored Understanding registry and its Cave effects.",
            `understanding::${filename}`,
        ],
        [
            "Carrier Editor",
            "Configure shared carrier visuals and pickup radius for the cave.",
            `carrier::${filename}`,
        ],
        [
            "Camera + World",
            "Configure camera zoom, pan, and world bounds.",
            `camera_world::${filename}`,
        ],
        [
            "Body Editor",
            "Configure body identity catalogs, Habiti, and Habiti assignment rules.",
            `body::${filename}`,
        ],
    ] as const;

export const SystemConfigEditor: React.FC<SystemConfigEditorProps> = ({
    filename,
}) => {
    const openFile = useShellStore((s) => s.openFile);
    return (
        <ToolFrame title={`System Config: ${filename}`}>
            <DashboardGrid>
                {buildCards(filename).map(([title, description, route]) => (
                    <Card
                        key={route}
                        variant="surface"
                        interactive
                        padding="md"
                        onClick={() => openFile(route)}
                    >
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </Card>
                ))}
            </DashboardGrid>
        </ToolFrame>
    );
};


import React from "react";
import { ToolFrame } from "../../../lib/atoms/tool-frame";
import { Card } from "../../../lib/atoms/card";
import { useShellStore } from "../../shell/shell";
import {
    DashboardGrid,
    CardTitle,
    CardDescription,
} from "./DraftPackEditor.styles";

interface DraftPackEditorProps {
    filename: string;
}

export const DraftPackEditor: React.FC<DraftPackEditorProps> = ({
    filename,
}) => {
    const openFile = useShellStore((s) => s.openFile);
    return (
        <ToolFrame title={`Draft Pack: ${filename}`}>
            <DashboardGrid>
                <Card
                    variant="surface"
                    interactive
                    padding="md"
                    onClick={() => openFile(`options::${filename}`)}
                >
                    <CardTitle>Draft Options</CardTitle>
                    <CardDescription>
                        Configure discrete events and choices.
                    </CardDescription>
                </Card>
                <Card
                    variant="surface"
                    interactive
                    padding="md"
                    onClick={() => openFile(`list::${filename}::draft_pools`)}
                >
                    <CardTitle>Draft Pools</CardTitle>
                    <CardDescription>
                        Manage weighted probability pools.
                    </CardDescription>
                </Card>
            </DashboardGrid>
        </ToolFrame>
    );
};

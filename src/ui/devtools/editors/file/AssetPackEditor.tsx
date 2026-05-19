import React from "react";
import { ToolFrame } from "../../../lib/atoms/tool-frame";
import { Card } from "../../../lib/atoms/card";
import { useShellStore } from "../../shell/shell";
import {
    DashboardGrid,
    CardTitle,
    CardDescription,
} from "../draft/DraftPackEditor.styles";

interface AssetPackEditorProps {
    filename: string;
}

export const AssetPackEditor: React.FC<AssetPackEditorProps> = ({
    filename,
}) => {
    const openFile = useShellStore((s) => s.openFile);
    return (
        <ToolFrame title={`Asset Pack: ${filename}`}>
            <DashboardGrid>
                <Card
                    variant="surface"
                    interactive
                    padding="md"
                    onClick={() =>
                        openFile(`list::${filename}::assets::displays`)
                    }
                >
                    <CardTitle>Displays</CardTitle>
                    <CardDescription>
                        Manage authored display assets.
                    </CardDescription>
                </Card>
                <Card
                    variant="surface"
                    interactive
                    padding="md"
                    onClick={() =>
                        openFile(`list::${filename}::assets::styles`)
                    }
                >
                    <CardTitle>Styles</CardTitle>
                    <CardDescription>
                        Define entity style presets.
                    </CardDescription>
                </Card>
                <Card
                    variant="surface"
                    interactive
                    padding="md"
                    onClick={() =>
                        openFile(`list::${filename}::assets::glyphs`)
                    }
                >
                    <CardTitle>Glyphs</CardTitle>
                    <CardDescription>Edit glyph preset assets.</CardDescription>
                </Card>
                <Card
                    variant="surface"
                    interactive
                    padding="md"
                    onClick={() => openFile(`background_config::${filename}`)}
                >
                    <CardTitle>Background</CardTitle>
                    <CardDescription>
                        Fullscreen biological fog background.
                    </CardDescription>
                </Card>
                <Card
                    variant="surface"
                    interactive
                    padding="md"
                    onClick={() => openFile(`vein_config::${filename}`)}
                >
                    <CardTitle>Vein Network</CardTitle>
                    <CardDescription>
                        Vein rendering and heartbeat config.
                    </CardDescription>
                </Card>
            </DashboardGrid>
        </ToolFrame>
    );
};


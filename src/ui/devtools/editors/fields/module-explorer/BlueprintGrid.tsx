import React from "react";
import { IconKey } from "../../../../lib/foundation/icon-registry/IconKey";
import { EditorItemWrapper } from "../../wrappers/EditorItemWrapper";
import { GameIcon } from "../../../../lib/atoms/game-icon";
import { Grid, ItemLabel } from "./ModuleExplorer.styles";
import { useBlueprintActions } from "./hooks/useBlueprintActions";
import { useBlueprintGrid } from "./hooks/useBlueprintGrid";
import {
    BlueprintCard,
    SettingsCard,
    SettingsIcon,
    TileContent,
} from "./BlueprintGrid.styles";

export interface BlueprintGridProps {
    filename: string;
    sessionId: string;
}

export const BlueprintGrid: React.FC<BlueprintGridProps> = ({
    filename,
    sessionId,
}) => {
    const { blueprints } = useBlueprintGrid({ filename, sessionId });

    const {
        handleOpenSettings: onOpenSettings,
        handleOpenBlueprint: onOpenBlueprint,
        handleDuplicate: onDuplicate,
        onDelete,
        handleCreateOptimistic: onCreate,
    } = useBlueprintActions({ filename, sessionId });

    return (
        <Grid>
            {/* 1. Module Settings (Root Node) */}
            <EditorItemWrapper onEdit={onOpenSettings}>
                <SettingsCard padding="md" interactive variant="highlight">
                    <TileContent>
                        <SettingsIcon>⚙️</SettingsIcon>
                        <ItemLabel>Settings</ItemLabel>
                    </TileContent>
                </SettingsCard>
            </EditorItemWrapper>

            {/* 2. Blueprints */}
            {blueprints.map(([id, bp]) => {
                const iconId =
                    bp.components?.display?.display_key || IconKey.Unknown;
                const label = bp.label || bp.components?.display?.label || id;

                return (
                    <EditorItemWrapper
                        key={id}
                        onEdit={() => onOpenBlueprint(id)}
                        onDelete={() => onDelete(id)}
                        onDuplicate={() => onDuplicate(id)}
                    >
                        <BlueprintCard padding="md" interactive>
                            <TileContent>
                                <GameIcon id={iconId} size="lg" />
                                <ItemLabel title={label}>{label}</ItemLabel>
                            </TileContent>
                        </BlueprintCard>
                    </EditorItemWrapper>
                );
            })}

            {/* 3. Ghost (Optimistic Creation) */}
            <EditorItemWrapper isGhost onEdit={onCreate} />
        </Grid>
    );
};

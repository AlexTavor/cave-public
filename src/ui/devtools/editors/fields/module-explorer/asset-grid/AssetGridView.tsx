import React from "react";
import { EditorItemWrapper } from "../../../wrappers/EditorItemWrapper";
import { GameIcon } from "../../../../../lib/atoms/game-icon";
import { AssetCard, Grid, ItemLabel } from "./AssetGrid.styles";
import type { AssetGridItem } from "./useAssetGrid";

interface AssetGridViewProps {
    assets: AssetGridItem[];
    onEditAsset: (id: string) => void;
    onDeleteAsset: (id: string) => void;
    onCreateAsset: () => void;
}

export const AssetGridView: React.FC<AssetGridViewProps> = ({
    assets,
    onEditAsset,
    onDeleteAsset,
    onCreateAsset,
}) => {
    return (
        <Grid>
            {assets.map(({ id }) => (
                <EditorItemWrapper
                    key={id}
                    onEdit={() => onEditAsset(id)}
                    onDelete={() => onDeleteAsset(id)}
                >
                    <AssetCard padding="md" interactive>
                        <GameIcon id={id} size="lg" />
                        <ItemLabel title={id}>{id}</ItemLabel>
                    </AssetCard>
                </EditorItemWrapper>
            ))}

            <EditorItemWrapper isGhost onEdit={onCreateAsset} />
        </Grid>
    );
};

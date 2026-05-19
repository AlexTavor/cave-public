import React from "react";
import { useAssetGrid } from "./useAssetGrid";
import { AssetGridView } from "./AssetGridView";

interface AssetGridProps {
    filename: string;
    sessionId: string;
}

export const AssetGrid: React.FC<AssetGridProps> = ({
    filename,
    sessionId,
}) => {
    const viewModel = useAssetGrid(filename, sessionId);

    return (
        <AssetGridView
            assets={viewModel.assets}
            onEditAsset={viewModel.onEditAsset}
            onDeleteAsset={viewModel.onDeleteAsset}
            onCreateAsset={viewModel.onCreateAsset}
        />
    );
};

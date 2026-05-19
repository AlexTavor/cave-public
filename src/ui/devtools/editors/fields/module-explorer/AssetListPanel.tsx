import React from "react";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { useScrollMemory } from "../../../hooks/useScrollMemory";
import { AssetGrid } from "./asset-grid/AssetGrid";
import { ListPanelToolbar } from "./ListPanelToolbar";
import { CreateAssetModal } from "../../assets/create-asset-modal/CreateAssetModal";
import { DeleteAssetConfirmModal } from "./DeleteAssetConfirmModal";
import { useExplorerListPanel } from "./hooks/useExplorerListPanel";
import { useExplorerStore } from "./state/explorerStore";
import type { AssetCategory } from "../../../state/moduleStore.assets";

interface AssetListPanelProps {
    filename: string;
    category: AssetCategory;
}

export const AssetListPanel: React.FC<AssetListPanelProps> = ({
    filename,
    category,
}) => {
    const sessionId = `list::${filename}::assets::${category}`;
    const scrollRef = useScrollMemory(sessionId);
    const viewState = useExplorerListPanel({ filename, sessionId });
    const session = useExplorerStore((s) => s.sessions[sessionId]);
    const closeCreateAsset = useExplorerStore(
        (s) => s.actions.closeCreateAsset,
    );

    if (viewState.isLoading) return <div>Loading...</div>;
    if (viewState.hasError) return <div>Error loading module.</div>;

    return (
        <ToolFrame
            title={`Assets — ${viewState.title} (v${viewState.version})`}
            toolbarActions={<ListPanelToolbar sessionId={sessionId} />}
            bodyRef={scrollRef}
        >
            <AssetGrid filename={filename} sessionId={sessionId} />

            <CreateAssetModal
                isOpen={session?.createAssetModalOpen ?? false}
                onClose={() => closeCreateAsset(sessionId)}
                filename={filename}
            />

            <DeleteAssetConfirmModal
                filename={filename}
                sessionId={sessionId}
            />
        </ToolFrame>
    );
};


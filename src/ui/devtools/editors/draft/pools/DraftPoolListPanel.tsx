import React from "react";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { Button } from "../../../../lib/atoms/button/Button";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { useScrollMemory } from "../../../hooks/useScrollMemory";
import { useDraftPoolListPanel } from "./useDraftPoolListPanel";
import {
    PanelHeader,
    PoolLabel,
    PoolList,
    PoolRow,
} from "./DraftPoolListPanel.styles";

interface DraftPoolListPanelProps {
    filename: string;
}

export const DraftPoolListPanel: React.FC<DraftPoolListPanelProps> = ({
    filename,
}) => {
    const scrollRef = useScrollMemory(`draft_pools::${filename}`);
    const viewState = useDraftPoolListPanel(filename);

    if (viewState.isLoading) return <div>Loading...</div>;
    if (viewState.hasError) return <div>Error loading module.</div>;

    return (
        <ToolFrame
            title={`Draft Pools — ${viewState.title} (v${viewState.version})`}
            bodyRef={scrollRef}
        >
            <PanelHeader>
                <div />
                <SmartTooltip content="Create a new draft pool">
                    <Button
                        size="sm"
                        variant="primary"
                        onClick={viewState.onCreate}
                    >
                        Create Pool
                    </Button>
                </SmartTooltip>
            </PanelHeader>
            <PoolList>
                {viewState.poolIds.map((poolId) => (
                    <PoolRow key={poolId}>
                        <PoolLabel>{poolId}</PoolLabel>
                        <div>
                            <SmartTooltip content="Open this pool for editing">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => viewState.onOpen(poolId)}
                                >
                                    Open
                                </Button>
                            </SmartTooltip>
                            <SmartTooltip content="Delete this pool permanently">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => viewState.onDelete(poolId)}
                                >
                                    Delete
                                </Button>
                            </SmartTooltip>
                        </div>
                    </PoolRow>
                ))}
            </PoolList>
        </ToolFrame>
    );
};

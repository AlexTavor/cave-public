import React from "react";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { Button } from "../../../../lib/atoms/button/Button";
import { useDraftOptionsPanel } from "./useDraftOptionsPanel";
import { OptionAccordionItem } from "./OptionAccordionItem";
import { OptionList, PanelHeader } from "./DraftOptionsPanel.styles";
import { useScrollMemory } from "../../../hooks/useScrollMemory";

interface DraftOptionsPanelProps {
    filename: string;
}

export const DraftOptionsPanel: React.FC<DraftOptionsPanelProps> = ({
    filename,
}) => {
    const scrollRef = useScrollMemory(`draft_options::${filename}`);
    const viewState = useDraftOptionsPanel(filename);

    if (viewState.isLoading) return <div>Loading...</div>;
    if (viewState.hasError) return <div>Error loading module.</div>;

    return (
        <ToolFrame
            title={`Draft Options — ${viewState.title} (v${viewState.version})`}
            bodyRef={scrollRef}
        >
            <PanelHeader>
                <div />
                <Button
                    size="sm"
                    variant="primary"
                    onClick={viewState.onCreate}
                >
                    Create Option
                </Button>
            </PanelHeader>
            <OptionList>
                {viewState.optionIds.map((optionId) => (
                    <OptionAccordionItem
                        key={optionId}
                        filename={filename}
                        optionId={optionId}
                        onDelete={viewState.onDelete}
                        onRename={viewState.onRename}
                    />
                ))}
            </OptionList>
        </ToolFrame>
    );
};

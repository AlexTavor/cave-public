import React from "react";
import { Virtuoso } from "react-virtuoso";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import { Button } from "../../../../lib/atoms/button";
import { HabitiGainDisplay } from "../../../habiti/HabitiGainDisplay";
import { AssignmentRequirementsSection } from "./AssignmentRequirementsSection";
import { BodyBrick } from "./BodyBrick";
import {
    PreviewBlock,
    SelectorContainer,
    SelectorFooter,
    SelectorHeader,
    SelectorListFrame,
    SelectorRow,
    SummaryRow,
} from "./BodySelector.styles";
import { resolveAbsorptionPreview } from "./resolveAbsorptionPreview";
import { resolveAssignmentRequirementsData } from "./assignmentRequirementsData";

type BodySelectorViewProps = {
    runtime: Runtime;
    candidateIds: string[];
    selectedIds: ReadonlySet<string>;
    canConfirm: boolean;
    preview: ReturnType<typeof resolveAbsorptionPreview>;
    showExpectedRewards: boolean;
    requirements: ReturnType<typeof resolveAssignmentRequirementsData>;
    onCancel: () => void;
    onConfirm: () => void;
    onListMouseDown: React.MouseEventHandler<HTMLElement>;
    onListMouseOver: React.MouseEventHandler<HTMLElement>;
    onListMouseUp: () => void;
};

const computeItemKey = (_: number, entityId: string) => entityId;
const renderRow =
    (runtime: Runtime, selectedIds: ReadonlySet<string>) =>
    (_: number, entityId: string) => (
        <SelectorRow>
            <BodyBrick
                entityId={entityId}
                runtime={runtime}
                selected={selectedIds.has(entityId)}
            />
        </SelectorRow>
    );

const BodySelectorViewBase = ({
    runtime,
    candidateIds,
    selectedIds,
    canConfirm,
    preview,
    showExpectedRewards,
    requirements,
    onCancel,
    onConfirm,
    onListMouseDown,
    onListMouseOver,
    onListMouseUp,
}: BodySelectorViewProps) => {
    return (
        <SelectorContainer
            onMouseUp={onListMouseUp}
            data-testid="body-selector"
        >
            <SelectorHeader>
                <SummaryRow>
                    <span>Selected: {selectedIds.size} bodies</span>
                    {showExpectedRewards ? (
                        <PreviewBlock>
                            <HabitiGainDisplay
                                items={preview.newHabitiEntries}
                                xpTotal={preview.xp}
                                resourceRows={preview.resourceRows}
                            />
                        </PreviewBlock>
                    ) : null}
                </SummaryRow>
                <AssignmentRequirementsSection
                    filterLabels={requirements.filterLabels}
                    minimumRows={requirements.minimumRows}
                />
            </SelectorHeader>
            <SelectorListFrame
                onMouseDown={onListMouseDown}
                onMouseOver={onListMouseOver}
            >
                <Virtuoso
                    data={candidateIds}
                    computeItemKey={computeItemKey}
                    style={{ height: "100%", overflowX: "hidden" }}
                    itemContent={renderRow(runtime, selectedIds)}
                />
            </SelectorListFrame>
            <SelectorFooter>
                <Button size="sm" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button
                    size="lg"
                    variant="primary"
                    disabled={!canConfirm}
                    onClick={onConfirm}
                >
                    Proceed
                </Button>
            </SelectorFooter>
        </SelectorContainer>
    );
};

export const BodySelectorView = React.memo(BodySelectorViewBase);

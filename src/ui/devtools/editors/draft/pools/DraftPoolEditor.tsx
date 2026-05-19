import React from "react";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { useDraftPoolEditor } from "./useDraftPoolEditor";
import { DistributionBar } from "./DistributionBar";
import { PoolEntryRow } from "./PoolEntryRow";
import { AddEntryInput } from "./AddEntryInput";
import { DraftPoolTextSection } from "./DraftPoolTextSection";
import { useScrollMemory } from "../../../hooks/useScrollMemory";

interface DraftPoolEditorProps {
    filename: string;
    poolId: string;
}

export const DraftPoolEditor: React.FC<DraftPoolEditorProps> = ({
    filename,
    poolId,
}) => {
    const scrollRef = useScrollMemory(`draft_pool::${filename}::${poolId}`);
    const viewState = useDraftPoolEditor(filename, poolId);

    if (viewState.isLoading) return <div>Loading...</div>;
    if (viewState.hasError) return <div>Error loading module.</div>;
    if (!viewState.pool) return <div>Pool not found.</div>;

    return (
        <ToolFrame
            title={`Draft Pool — ${viewState.title} (v${viewState.version})`}
            bodyRef={scrollRef}
        >
            <DraftPoolTextSection
                filename={filename}
                poolId={poolId}
                texts={viewState.texts}
                onAdd={viewState.addText}
                onRemove={viewState.removeText}
            />
            <DistributionBar
                entries={viewState.entries}
                options={viewState.options}
            />
            {viewState.entries.map((entry, index) => (
                <PoolEntryRow
                    key={`${entry.optionId}-${index}`}
                    entry={entry}
                    option={viewState.options[entry.optionId]}
                    filename={filename}
                    onWeightChange={(weight) =>
                        viewState.updateWeight(index, weight)
                    }
                    onOneOffChange={(checked) =>
                        viewState.updateOneOff(entry.optionId, checked)
                    }
                    onRemove={() => viewState.removeEntry(index)}
                />
            ))}
            <AddEntryInput
                value={viewState.input}
                options={viewState.options}
                addedIds={viewState.addedIds}
                error={viewState.error}
                onChange={viewState.setInput}
                onSubmit={viewState.addEntry}
                onCreate={viewState.createOption}
            />
        </ToolFrame>
    );
};


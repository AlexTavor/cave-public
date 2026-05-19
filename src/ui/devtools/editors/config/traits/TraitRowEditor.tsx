import React, { useCallback } from "react";
import styled from "@emotion/styled";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath } from "../../../../../utils/objectUtils";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import { SimpleStringField } from "../../blueprint/mode/forms/SimpleStringField";
import { TraitModifiersSection } from "./TraitModifiersSection";
import { TraitCyclesSection } from "./TraitCyclesSection";
import { EditableTraitId } from "./EditableTraitId";
import type { TraitDefinition } from "../../../../../data/schemas/game/traits";

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

interface TraitRowEditorProps {
    filename: string;
    traitId: string;
    registryPath: string;
    onDelete: () => void;
    onRename: (oldId: string, newId: string) => string | null;
    suggestions?: string[];
}

export const TraitRowEditor: React.FC<TraitRowEditorProps> = ({
    filename,
    traitId,
    registryPath,
    onDelete,
    onRename,
    suggestions,
}) => {
    const basePath = `${registryPath}.${traitId}`;

    const label = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return traitId;
                const trait = getByPath(session.draft, basePath) as
                    | TraitDefinition
                    | undefined;
                return trait?.label || traitId;
            },
            [filename, basePath, traitId],
        ),
    );

    return (
        <ComponentRow
            title={
                <EditableTraitId
                    traitId={traitId}
                    onRename={(newId) => onRename(traitId, newId)}
                />
            }
            titleTooltip={traitId}
            icon={<span>🏷️</span>}
            summary={label === traitId ? undefined : label}
            defaultOpen={false}
            onDelete={onDelete}
            deleteLabel="Remove Trait"
        >
            <Body>
                <SimpleStringField
                    label="Label"
                    filename={filename}
                    path={`${basePath}.label`}
                    tooltip="Human-readable name displayed in the UI."
                />
                <SimpleStringField
                    label="Description (optional)"
                    filename={filename}
                    path={`${basePath}.description`}
                    tooltip="Brief explanation of what this trait does."
                />
                <TraitModifiersSection
                    filename={filename}
                    basePath={`${basePath}.modifiers`}
                    suggestions={suggestions}
                />
                <TraitCyclesSection
                    filename={filename}
                    basePath={`${basePath}.cycles`}
                    suggestions={suggestions}
                />
            </Body>
        </ComponentRow>
    );
};

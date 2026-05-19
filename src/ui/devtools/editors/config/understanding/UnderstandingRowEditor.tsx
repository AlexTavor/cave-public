import React, { useCallback } from "react";
import { z } from "zod";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import { getByPath } from "../../../../../utils/objectUtils";
import { useSessionStore } from "../../../state/useSessionStore";
import { StringField } from "../../fields/string-field/StringField";
import { EditableTraitId } from "../traits/EditableTraitId";
import { HabitusEffectsSection } from "../body/habiti/HabitusEffectsSection";

export const UnderstandingRowEditor: React.FC<{
    filename: string;
    understandingId: string;
    onDelete: () => void;
    onRename: (oldId: string, newId: string) => string | null;
}> = ({ filename, understandingId, onDelete, onRename }) => {
    const basePath = `config.understanding.${understandingId}`;
    const label = useSessionStore(
        useCallback(
            (state) =>
                (getByPath(
                    state.sessions[filename]?.draft,
                    `${basePath}.label`,
                ) as string) ?? understandingId,
            [basePath, filename, understandingId],
        ),
    );
    return (
        <ComponentRow
            title={
                <EditableTraitId
                    traitId={understandingId}
                    onRename={(value) => onRename(understandingId, value)}
                />
            }
            titleTooltip="Open this Understanding row to edit its id, label, description, and effects."
            summary={label}
            onDelete={onDelete}
            deleteLabel="Remove Understanding"
        >
            <StringField
                label="Label"
                schema={z.string()}
                filename={filename}
                path={`${basePath}.label`}
                tooltip="Set the user-facing name shown for this Understanding in runtime UI."
            />
            <StringField
                label="Description"
                schema={z.string()}
                filename={filename}
                path={`${basePath}.description`}
                tooltip="Describe what this Understanding represents for authors and players."
                forceTextArea
            />
            <HabitusEffectsSection
                filename={filename}
                basePath={basePath}
                subjectLabel="Understanding"
            />
        </ComponentRow>
    );
};

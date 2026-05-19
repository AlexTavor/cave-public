import React, { useCallback } from "react";
import { z } from "zod";
import { ComponentRow } from "../../../../../lib/atoms/component-row";
import { useSessionStore } from "../../../../state/useSessionStore";
import { getByPath } from "../../../../../../utils/objectUtils";
import { EnumField } from "../../../fields/enum-field/EnumField";
import { StringField } from "../../../fields/string-field/StringField";
import { EditableTraitId } from "../../traits/EditableTraitId";
import { HabitusConstraintsSection } from "./HabitusConstraintsSection";
import { HabitusEffectsSection } from "./HabitusEffectsSection";
import { useBodyConfigSession } from "../useBodyConfigSession";
import { habitusTypeSchema } from "../habitusTypes";

export const HabitusRowEditor: React.FC<{
    filename: string;
    habitusId: string;
    onDelete: () => void;
    onRename: (oldId: string, newId: string) => string | null;
}> = ({ filename, habitusId, onDelete, onRename }) => {
    const basePath = `config.habiti.${habitusId}`;
    const { setHabitusType } = useBodyConfigSession(filename);
    const label = useSessionStore(
        useCallback(
            (state) =>
                (getByPath(
                    state.sessions[filename]?.draft,
                    `${basePath}.label`,
                ) as string) ?? habitusId,
            [basePath, filename, habitusId],
        ),
    );
    return (
        <ComponentRow
            title={
                <EditableTraitId
                    traitId={habitusId}
                    onRename={(value) => onRename(habitusId, value)}
                />
            }
            titleTooltip="Open this Habitus row to edit its id, label, description, type, effects, and constraints."
            summary={label}
            onDelete={onDelete}
            deleteLabel="Remove Habitus"
        >
            <StringField
                label="Label"
                schema={z.string()}
                filename={filename}
                path={`${basePath}.label`}
                tooltip="Set the user-facing name shown for this Habitus in runtime UI."
            />
            <StringField
                label="Description"
                schema={z.string()}
                filename={filename}
                path={`${basePath}.description`}
                tooltip="Describe what this Habitus represents for authors and players."
            />
            <StringField
                label="Summary"
                schema={z.string()}
                filename={filename}
                path={`${basePath}.summary`}
                tooltip="Write the short Cave-only summary shown on Habiti pills."
                forceTextArea
            />
            <EnumField
                label="Type"
                schema={habitusTypeSchema}
                filename={filename}
                path={`${basePath}.type`}
                tooltip="Choose which identity or authored category this Habitus belongs to."
                onValueChange={(value) =>
                    setHabitusType(
                        habitusId,
                        value as z.infer<typeof habitusTypeSchema>,
                    )
                }
            />
            <HabitusEffectsSection filename={filename} basePath={basePath} />
            <HabitusConstraintsSection
                filename={filename}
                basePath={basePath}
            />
        </ComponentRow>
    );
};

import React from "react";
import { Button } from "../../../../../lib/atoms/button";
import { ComponentRow } from "../../../../../lib/atoms/component-row";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";
import { useBodyConfigSession } from "../useBodyConfigSession";
import { HabitusRowEditor } from "./HabitusRowEditor";

export const HabitiEditor: React.FC<{ filename: string }> = ({ filename }) => {
    const { habitusIds, addHabitus, removeHabitus, renameHabitus } =
        useBodyConfigSession(filename);
    return (
        <ComponentRow
            title="Habiti Registry"
            titleTooltip="Open the authored Habiti registry and edit each Habitus definition."
            defaultOpen
        >
            {habitusIds.map((habitusId) => (
                <HabitusRowEditor
                    key={habitusId}
                    filename={filename}
                    habitusId={habitusId}
                    onDelete={() => removeHabitus(habitusId)}
                    onRename={renameHabitus}
                />
            ))}
            <SmartTooltip content="Add a new Habitus definition to the registry.">
                <Button size="sm" variant="ghost" onClick={addHabitus}>
                    + Add Habitus
                </Button>
            </SmartTooltip>
        </ComponentRow>
    );
};

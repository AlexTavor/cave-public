import React from "react";
import { Button } from "../../../../../lib/atoms/button";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";
import { useSimpleArrayField } from "../../../blueprint/mode/forms/useSimpleArrayField";
import { createDefaultHabitusEffect } from "../bodyEditorDefaults";
import { HabitusEffectRow } from "./HabitusEffectRow";

type HabitusEffectsSectionProps = {
    filename: string;
    basePath: string;
    subjectLabel?: string;
};

export const HabitusEffectsSection: React.FC<HabitusEffectsSectionProps> = ({
    filename,
    basePath,
    subjectLabel = "Habitus",
}) => {
    const effects = useSimpleArrayField(
        filename,
        `${basePath}.effects`,
        createDefaultHabitusEffect,
    );
    return (
        <div>
            {effects.items.map((_, index) => (
                <HabitusEffectRow
                    key={`${basePath}.effects.${index}`}
                    filename={filename}
                    path={`${basePath}.effects.${index}`}
                    index={index}
                    subjectLabel={subjectLabel}
                    onDelete={() => effects.remove(index)}
                />
            ))}
            <SmartTooltip
                content={`Add another authored effect to this ${subjectLabel}.`}
            >
                <Button size="sm" variant="ghost" onClick={effects.add}>
                    + Add Effect
                </Button>
            </SmartTooltip>
        </div>
    );
};

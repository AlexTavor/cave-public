import React from "react";
import { ComponentRow } from "../../../../../lib/atoms/component-row";
import { EnumField } from "../../../fields/enum-field/EnumField";
import { NumberField } from "../../../fields/number-field/NumberField";
import { formatHabitusTypeLabel, habitusTypeSchema } from "../habitusTypes";
import { useBodyConfigSession } from "../useBodyConfigSession";
import { WeightedHabitusPoolField } from "./WeightedHabitusPoolField";

export const HabitiRuleRow: React.FC<{
    filename: string;
    index: number;
    onDelete: () => void;
}> = ({ filename, index, onDelete }) => {
    const {
        rules,
        getPoolSuggestions,
        commitWeightedPool,
        setRuleHabitusType,
    } = useBodyConfigSession(filename);
    const basePath = `config.settings.body.habitusTypeRules.${index}`;
    const rule = rules[index];
    const habitusType = rule?.habitusType ?? "unique_body";
    const poolSize = rule?.weightedPool.length ?? 0;
    return (
        <ComponentRow
            title={formatHabitusTypeLabel(habitusType)}
            titleTooltip="Open this per-type Habiti rule to edit how generated bodies receive Habiti from the registry."
            summary={`${poolSize} pooled`}
            onDelete={onDelete}
            deleteLabel="Remove Rule"
        >
            <EnumField
                label="Habitus Type"
                schema={habitusTypeSchema}
                filename={filename}
                path={`${basePath}.habitusType`}
                tooltip="Choose which Habitus type this rule is allowed to generate from the registry."
                onValueChange={(value) =>
                    setRuleHabitusType(index, value as typeof habitusType)
                }
            />
            <NumberField
                label="Probability"
                schema={undefined as never}
                filename={filename}
                path={`${basePath}.probability`}
                tooltip="Set the per-roll continuation probability for this type rule."
            />
            <NumberField
                label="Max Count"
                schema={undefined as never}
                filename={filename}
                path={`${basePath}.maxCount`}
                tooltip="Limit how many Habiti this type rule can assign to a single body."
            />
            <WeightedHabitusPoolField
                label="Weighted Pool"
                filename={filename}
                path={`${basePath}.weightedPool`}
                suggestions={getPoolSuggestions(habitusType)}
                tooltip="Choose eligible Habiti from the registry and assign each one a deterministic weight."
                onCommitEntries={(entries) =>
                    commitWeightedPool(index, entries)
                }
            />
        </ComponentRow>
    );
};

import React from "react";
import { z } from "zod";
import { ComponentRow } from "../../../../../lib/atoms/component-row";
import { getByPath } from "../../../../../../utils/objectUtils";
import { useSessionStore } from "../../../../state/useSessionStore";
import { EnumField } from "../../../fields/enum-field/EnumField";
import { NumberField } from "../../../fields/number-field/NumberField";
import { StringField } from "../../../fields/string-field/StringField";
import { HabitusEffectDescriptionField } from "./HabitusEffectDescriptionField";

const effectTypeSchema = z.enum([
    "add_cave_attribute",
    "add_absorption_xp_conversion",
    "add_resource_gain_multiplier",
    "add_producer_output_multiplier",
    "increase_max_purge",
]);
const attributeSchema = z.enum(["body", "mind", "social"]);

type HabitusEffectRowProps = {
    filename: string;
    path: string;
    index: number;
    subjectLabel?: string;
    onDelete: () => void;
};

export const HabitusEffectRow: React.FC<HabitusEffectRowProps> = ({
    filename,
    path,
    index,
    subjectLabel = "Habitus",
    onDelete,
}) => {
    const rowTooltip = `Open this effect row to edit the authored effect for this ${subjectLabel}.`;
    const typeTooltip = `Choose which permanent Cave bonus this ${subjectLabel} effect applies.`;
    const attributeTooltip = `Choose which Cave attribute this ${subjectLabel} permanently increases.`;
    const resourceTooltip = `Choose which absorbed resource this ${subjectLabel} should multiply.`;
    const producerTooltip = `Choose which producer tag must be present for this ${subjectLabel} bonus to apply.`;
    const amountTooltip = `Set the numeric amount applied by this ${subjectLabel} effect.`;
    const effectType = useSessionStore(
        (state) =>
            (getByPath(
                state.sessions[filename]?.draft,
                `${path}.type`,
            ) as string) ?? "add_cave_attribute",
    );
    return (
        <ComponentRow
            title={`Effect ${index + 1}`}
            titleTooltip={rowTooltip}
            defaultOpen={index === 0}
            onDelete={onDelete}
            deleteLabel="Remove Effect"
        >
            <EnumField
                label="Type"
                schema={effectTypeSchema}
                filename={filename}
                path={`${path}.type`}
                tooltip={typeTooltip}
            />
            {effectType === "add_cave_attribute" ? (
                <EnumField
                    label="Attribute"
                    schema={attributeSchema}
                    filename={filename}
                    path={`${path}.attribute`}
                    tooltip={attributeTooltip}
                />
            ) : null}
            {effectType === "add_resource_gain_multiplier" ? (
                <StringField
                    label="Resource"
                    schema={z.string()}
                    filename={filename}
                    path={`${path}.resource`}
                    tooltip={resourceTooltip}
                />
            ) : null}
            {effectType === "add_producer_output_multiplier" ? (
                <StringField
                    label="Producer Tag"
                    schema={z.string()}
                    filename={filename}
                    path={`${path}.producerTag`}
                    tooltip={producerTooltip}
                />
            ) : null}
            <HabitusEffectDescriptionField
                filename={filename}
                path={path}
                subjectLabel={subjectLabel}
            />
            <NumberField
                label="Amount"
                schema={z.number()}
                filename={filename}
                path={`${path}.amount`}
                tooltip={amountTooltip}
            />
        </ComponentRow>
    );
};

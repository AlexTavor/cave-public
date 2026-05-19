import React from "react";
import { z } from "zod";
import { ScalableValueSchema } from "../../../../../../data/schemas/abilities/utils";
import { useBlueprintContext } from "../../BlueprintContext";
import { ScalableValueInput } from "./atoms/ScalableValueInput";
import {
    Checkbox,
    CursorLabel,
} from "../../../fields/boolean-field/BooleanField.styles";
import { BooleanField } from "../../../fields/boolean-field/BooleanField";
import { NumberField } from "../../../fields/number-field/NumberField";
import { useCycleInputToggles } from "./useCycleInputToggles";
import { CycleLifecycleSection } from "./CycleLifecycleSection";
import { CycleResourceCostsSection } from "./CycleResourceCostsSection";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";
import { cycleToggleFields } from "./CycleAbilityForm.constants";

const inputs = ["body", "mind", "social"] as const;

interface CycleAbilityFormProps {
    rootPath: string;
}

export const CycleAbilityForm: React.FC<CycleAbilityFormProps> = ({
    rootPath,
}) => {
    const { filename } = useBlueprintContext();
    const basePath = `${rootPath}._editor.abilities.cycle`;
    const scalarShape = ScalableValueSchema.shape;
    const { isEnabled, toggleInput } = useCycleInputToggles(filename, basePath);

    return (
        <>
            <ScalableValueInput
                label="Max Progress"
                filename={filename}
                basePath={`${basePath}.maxProgress`}
                baseSchema={scalarShape.base}
                perBodySchema={scalarShape.perBody}
                tooltipBase="The total energy (Joules) required to complete one loop."
                tooltipPerBody="The total energy (Joules) required to complete one loop."
            />

            <NumberField
                label="Cost ×/Cycle"
                schema={z.number()}
                filename={filename}
                path={`${basePath}.costMultPerCycle`}
                tooltip="Multiplier added per completed cycle. e.g. 1 doubles cost each cycle."
            />

            <SmartTooltip content="Defines energy demand per second (Watts) for specific attributes.">
                <CursorLabel>Energy Inputs</CursorLabel>
            </SmartTooltip>

            {inputs.map((input) => (
                <div key={input}>
                    <CursorLabel>
                        {input}
                        <Checkbox
                            type="checkbox"
                            checked={isEnabled(input)}
                            onChange={(e) =>
                                toggleInput(input, e.target.checked)
                            }
                        />
                    </CursorLabel>
                    {isEnabled(input) && (
                        <ScalableValueInput
                            label={`${input} demand`}
                            filename={filename}
                            basePath={`${basePath}.inputs.${input}`}
                            baseSchema={scalarShape.base}
                            perBodySchema={scalarShape.perBody}
                            tooltipBase="Base demand + scaling based on Global Population."
                            tooltipPerBody="Base demand + scaling based on Global Population."
                        />
                    )}
                </div>
            ))}

            {cycleToggleFields.map((field) => (
                <BooleanField
                    key={field.path}
                    label={field.label}
                    schema={z.boolean()}
                    filename={filename}
                    path={`${basePath}.${field.path}`}
                    tooltip={field.tooltip}
                />
            ))}

            <CycleLifecycleSection />
            <CycleResourceCostsSection
                filename={filename}
                basePath={basePath}
            />
        </>
    );
};


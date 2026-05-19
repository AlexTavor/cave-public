import React from "react";
import { z } from "zod";
import { useBlueprintContext } from "../../BlueprintContext";
import { NumberField } from "../../../fields/number-field/NumberField";
import { BooleanField } from "../../../fields/boolean-field/BooleanField";
import { AssignmentResultsSection } from "./AssignmentResultsSection";
import { AssignmentFiltersSection } from "./AssignmentFiltersSection";
import { AssignmentMinimumsSection } from "./AssignmentMinimumsSection";

interface AssignmentAbilityFormProps {
    basePath: string;
}

const numberSchema = z.number();

export const AssignmentAbilityForm: React.FC<AssignmentAbilityFormProps> = ({
    basePath,
}) => {
    const { filename } = useBlueprintContext();
    return (
        <>
            <NumberField
                label="Slots"
                schema={numberSchema}
                filename={filename}
                path={`${basePath}.slots`}
                tooltip="The maximum number of entities that can be assigned here simultaneously."
            />
            <BooleanField
                label="Locking"
                schema={z.boolean()}
                filename={filename}
                path={`${basePath}.locking`}
                tooltip="If true, assigned entities cannot be automatically recalled by the Dispatch system logic."
            />
            <NumberField
                label="Processing Duration (s)"
                schema={numberSchema}
                filename={filename}
                path={`${basePath}.duration`}
                tooltip="Duration in seconds for the processing cycle to complete."
            />
            <BooleanField
                label="One-Off"
                schema={z.boolean()}
                filename={filename}
                path={`${basePath}.oneOff`}
                tooltip="If enabled, this assignment depletes after one completion and uses the cycle GC contract."
            />
            <AssignmentFiltersSection basePath={basePath} />
            <AssignmentMinimumsSection basePath={basePath} />
            <AssignmentResultsSection basePath={basePath} filename={filename} />
        </>
    );
};


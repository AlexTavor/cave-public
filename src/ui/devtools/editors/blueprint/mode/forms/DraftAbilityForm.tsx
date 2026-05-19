import React, { useCallback, useMemo } from "react";
import { z } from "zod";
import { useBlueprintContext } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { AutocompleteStringField } from "./atoms/AutocompleteStringField";
import { SliderField } from "../../../fields/number-field/SliderField";
import { SimpleStringField } from "./SimpleStringField";
import { ConditionsField } from "../../../conditions/ConditionsField";
import { BehaviorActionArrayField } from "./BehaviorActionArrayField";
import { AbilityTriggerField } from "./AbilityTriggerField";

interface DraftAbilityFormProps {
    basePath: string;
}

const countSchema = z.number().min(1).max(5);
const poolSliderMeta = { min: 1, max: 5, step: 1 };
const EMPTY_POOLS: Record<string, { id: string }> = {};

export const DraftAbilityForm: React.FC<DraftAbilityFormProps> = ({
    basePath,
}) => {
    const { filename } = useBlueprintContext();
    const draftPools = useSessionStore(
        useCallback(
            (state) =>
                state.sessions[filename]?.draft.draftPools ?? EMPTY_POOLS,
            [filename],
        ),
    );
    const sortedSuggestions = useMemo(
        () => Object.keys(draftPools).sort((a, b) => a.localeCompare(b)),
        [draftPools],
    );

    return (
        <>
            <AutocompleteStringField
                label="Pool"
                filename={filename}
                path={`${basePath}.poolId`}
                suggestions={sortedSuggestions}
                tooltip="The draft pool to present when the cycle completes."
            />
            <SliderField
                label="Count"
                schema={countSchema}
                filename={filename}
                path={`${basePath}.count`}
                sliderMeta={poolSliderMeta}
            />
            <SimpleStringField
                label="Label"
                filename={filename}
                path={`${basePath}.label`}
                tooltip="Optional display title shown in the draft UI."
            />
            <AbilityTriggerField
                filename={filename}
                path={`${basePath}.triggers`}
            />
            <ConditionsField
                filename={filename}
                path={`${basePath}.conditions`}
            />
            <BehaviorActionArrayField
                label="On Complete"
                filename={filename}
                path={`${basePath}.onComplete`}
                tooltip="Runs only when no eligible entries remain after filtering and one-off exclusion."
            />
        </>
    );
};


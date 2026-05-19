import React, { useCallback, useMemo } from "react";
import { z } from "zod";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";
import { useBlueprintContext } from "../../BlueprintContext";
import { useBlueprintSlice } from "../../../../state/moduleSession/useBlueprintSlice";
import { useSessionStore } from "../../../../state/useSessionStore";
import { StructuredConditionsField } from "../../../conditions/StructuredConditionsField";
import {
    Checkbox,
    CursorLabel,
} from "../../../fields/boolean-field/BooleanField.styles";
import { FieldContainer } from "../../../fields/Shared.styles";
import { NumberField } from "../../../fields/number-field/NumberField";
import { StringField } from "../../../fields/string-field/StringField";
import { buildConditionalActivationTargetOptions } from "../conditionalActivationTargetOptions";
import type { ConditionalActivationTarget } from "../../../../../../data/schemas/abilities/conditionalActivation";

const stringSchema = z.string();
const numberSchema = z.number();

export const ConditionalActivationAbilityForm: React.FC<{
    basePath: string;
}> = ({ basePath }) => {
    const { filename, blueprintId } = useBlueprintContext();
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const blueprint = useBlueprintSlice(filename, blueprintId);
    const abilities = blueprint?._editor?.abilities ?? {};
    const targets = useSessionStore(
        (state) =>
            (getByPath(
                state.sessions[filename]?.draft,
                `${basePath}.targets`,
            ) as ConditionalActivationTarget[] | undefined) ?? [],
    );
    const options = useMemo(
        () => buildConditionalActivationTargetOptions(abilities, targets),
        [abilities, targets],
    );

    const toggleTarget = useCallback(
        (checked: boolean, target?: ConditionalActivationTarget) => {
            if (!target) return;
            updateDraft(filename, (draft) => {
                const next = (
                    (getByPath(draft, `${basePath}.targets`) as
                        | ConditionalActivationTarget[]
                        | undefined) ?? []
                ).filter(
                    (item) =>
                        item.ability !== target.ability ||
                        item.targetId !== target.targetId,
                );
                if (checked) next.push(target);
                setByPath(draft, `${basePath}.targets`, next);
            });
        },
        [basePath, filename, updateDraft],
    );

    return (
        <>
            <NumberField
                label="Priority"
                schema={numberSchema}
                filename={filename}
                path={`${basePath}.priority`}
            />
            <StringField
                label="Inactive Explanation"
                schema={stringSchema}
                filename={filename}
                path={`${basePath}.inactiveExplanation`}
                forceTextArea
                tooltip="Explain why targeted abilities are inactive until these conditions become true."
            />
            <StructuredConditionsField
                filename={filename}
                path={`${basePath}.conditions`}
            />
            <FieldContainer>
                {options.map((option) => {
                    const control = (
                        <CursorLabel key={option.rowKey}>
                            {option.label}
                            <Checkbox
                                type="checkbox"
                                checked={option.checked}
                                disabled={!option.targetable}
                                onChange={(event) =>
                                    toggleTarget(
                                        event.target.checked,
                                        option.target,
                                    )
                                }
                            />
                        </CursorLabel>
                    );
                    return option.disabledReason ? (
                        <SmartTooltip
                            key={option.rowKey}
                            content={option.disabledReason}
                        >
                            {control}
                        </SmartTooltip>
                    ) : (
                        control
                    );
                })}
            </FieldContainer>
        </>
    );
};

import React from "react";
import styled from "@emotion/styled";
import type { HabitusEffect } from "../../../../../../data/schemas/game/habiti";
import { generateHabitusEffectDescription } from "../../../../../../game/habiti/generateHabitusEffectDescription";
import { setByPath, getByPath } from "../../../../../../utils/objectUtils";
import { Button } from "../../../../../lib/atoms/button";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";
import { Label, FieldContainer, TextArea } from "../../../fields/Shared.styles";
import { useStringField } from "../../../fields/string-field/useStringField";
import { useSessionStore } from "../../../../state/useSessionStore";
import { createDefaultHabitusEffect } from "../bodyEditorDefaults";

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
`;

type HabitusEffectDescriptionFieldProps = {
    filename: string;
    path: string;
    subjectLabel: string;
};

const fallbackEffect = createDefaultHabitusEffect();

const getGenerateTooltip = (
    result: ReturnType<typeof generateHabitusEffectDescription>,
) => {
    if (result.ok) {
        return "Overwrite the authored description from the current effect fields.";
    }
    if (result.reason === "missing_resource") {
        return "Generation is unavailable until Resource is not empty.";
    }
    return "Generation is unavailable until Producer Tag is not empty.";
};

export const HabitusEffectDescriptionField: React.FC<
    HabitusEffectDescriptionFieldProps
> = ({ filename, path, subjectLabel }) => {
    const inputId = React.useId();
    const descriptionPath = `${path}.description`;
    const effect = useSessionStore(
        React.useCallback(
            (state) =>
                (getByPath(
                    state.sessions[filename]?.draft,
                    path,
                ) as HabitusEffect) ?? fallbackEffect,
            [filename, path],
        ),
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const { localValue, setLocalValue, handleBlur } = useStringField(
        filename,
        descriptionPath,
    );
    const result = generateHabitusEffectDescription(effect);

    const handleGenerate = () => {
        if (!result.ok) return;
        updateDraft(filename, (draft) => {
            setByPath(draft, descriptionPath, result.description);
        });
    };

    return (
        <FieldContainer>
            <Header>
                <SmartTooltip
                    content={`Write the authored Cave-only effect text for this ${subjectLabel} effect.`}
                >
                    <Label htmlFor={inputId}>Description</Label>
                </SmartTooltip>
                <SmartTooltip content={getGenerateTooltip(result)}>
                    <span>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleGenerate}
                            disabled={!result.ok}
                        >
                            Generate Description
                        </Button>
                    </span>
                </SmartTooltip>
            </Header>
            <TextArea
                id={inputId}
                value={localValue}
                onChange={(event) => setLocalValue(event.target.value)}
                onBlur={handleBlur}
            />
        </FieldContainer>
    );
};

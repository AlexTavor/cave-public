import React from "react";
import { useBlueprintContext } from "../../BlueprintContext";
import { Button } from "../../../../../lib/atoms/button";
import { InjectionAbilityItem } from "./InjectionAbilityItem";
import { useInjectionAbilityList } from "./useInjectionAbilityList";
import {
    FormSection,
    SectionLabel,
    ButtonRow,
} from "./InjectionAbilityForm.styles";

interface InjectionAbilityFormProps {
    basePath: string;
}

export const InjectionAbilityForm: React.FC<InjectionAbilityFormProps> = ({
    basePath,
}) => {
    const { filename } = useBlueprintContext();
    const { injections, addInjection, removeInjection } =
        useInjectionAbilityList(filename, basePath);

    return (
        <FormSection>
            <SectionLabel>Injections</SectionLabel>
            {injections.map((_, index) => (
                <InjectionAbilityItem
                    key={`${basePath}.${index}`}
                    filename={filename}
                    basePath={`${basePath}.${index}`}
                    onRemove={() => removeInjection(index)}
                />
            ))}
            <ButtonRow>
                <Button size="sm" variant="ghost" onClick={addInjection}>
                    Add Injection
                </Button>
            </ButtonRow>
        </FormSection>
    );
};

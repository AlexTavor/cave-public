import React, { useMemo } from "react";
import { z } from "zod";
import { EnumField } from "../../../fields/enum-field/EnumField";
import { NumberField } from "../../../fields/number-field/NumberField";
import { Button } from "../../../../../lib/atoms/button";
import { AutocompleteStringField } from "./atoms/AutocompleteStringField";
import { useInjectionEffects } from "./useInjectionEffects";
import { useInjectionSuggestions } from "./useInjectionSuggestions";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";
import {
    ButtonRow,
    EffectsHeader,
    EffectsList,
    EffectsRow,
    InjectionCard,
} from "./InjectionAbilityForm.styles";

interface InjectionAbilityItemProps {
    filename: string;
    basePath: string;
    onRemove: () => void;
}

export const InjectionAbilityItem: React.FC<InjectionAbilityItemProps> = ({
    filename,
    basePath,
    onRemove,
}) => {
    const { effects, isOpen, toggle, addEffect, removeEffect } =
        useInjectionEffects(filename, basePath);
    const { tagSuggestions, targetPathSuggestions } =
        useInjectionSuggestions(filename);
    const effectSchema = useMemo(
        () => z.enum(["SET", "ADD", "SUB", "MULT", "DIV"]),
        [],
    );
    const numberSchema = useMemo(() => z.number(), []);

    return (
        <InjectionCard>
            <AutocompleteStringField
                label="Target Tag"
                filename={filename}
                path={`${basePath}.targetTag`}
                suggestions={tagSuggestions}
                placeholder="producer"
                tooltip="The tag to search for in the world (e.g., producer)."
            />
            <EffectsHeader>
                <SmartTooltip content="List of math operations to apply to the target.">
                    <div>Effects</div>
                </SmartTooltip>
                <Button size="sm" variant="ghost" onClick={toggle}>
                    {isOpen ? "Collapse" : "Expand"}
                </Button>
            </EffectsHeader>
            {isOpen && (
                <EffectsList>
                    {effects.map((_, index) => (
                        <EffectsRow key={`${basePath}.effects.${index}`}>
                            <EnumField
                                label="Op"
                                schema={effectSchema}
                                filename={filename}
                                path={`${basePath}.effects.${index}.op`}
                                tooltip="Operation: ADD, MULT, or SET."
                            />
                            <AutocompleteStringField
                                label="Target Path"
                                filename={filename}
                                path={`${basePath}.effects.${index}.target`}
                                suggestions={targetPathSuggestions}
                                placeholder="self.state.cycle.max"
                                tooltip="The state path on the destination entity (e.g., state.cycle.max)."
                            />
                            <NumberField
                                label="Value"
                                schema={numberSchema}
                                filename={filename}
                                path={`${basePath}.effects.${index}.value`}
                                tooltip="Static number to apply."
                            />
                            <ButtonRow>
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => removeEffect(index)}
                                >
                                    Remove Effect
                                </Button>
                            </ButtonRow>
                        </EffectsRow>
                    ))}
                    <ButtonRow>
                        <Button size="sm" variant="ghost" onClick={addEffect}>
                            Add Effect
                        </Button>
                    </ButtonRow>
                </EffectsList>
            )}
            <ButtonRow>
                <Button size="sm" variant="danger" onClick={onRemove}>
                    Remove Injection
                </Button>
            </ButtonRow>
        </InjectionCard>
    );
};

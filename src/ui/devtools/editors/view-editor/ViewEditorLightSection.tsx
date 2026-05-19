import React from "react";
import {
    FieldLabel,
    InlineFields,
    RangeInput,
    SectionTitle,
    SelectInput,
    TextInput,
    VisualSection,
} from "../blueprint/visuals/BlueprintVisualsModal.styles";
import { ViewEditorColorField } from "./ViewEditorColorField";
import type { ViewEditorAdapter } from "./ViewEditor.types";

export const ViewEditorLightSection: React.FC<{
    light: ViewEditorAdapter["light"];
    paletteOptions: ViewEditorAdapter["projectDefaults"]["paletteOptions"];
}> = ({ light, paletteOptions }) => (
    <VisualSection>
        <SectionTitle>Light</SectionTitle>
        <FieldLabel>
            Light Enabled
            <TextInput
                type="checkbox"
                checked={light.enabled}
                onChange={(e) => light.updateEnabled(e.target.checked)}
            />
        </FieldLabel>
        {light.enabled ? (
            <>
                <InlineFields>
                    <ViewEditorColorField
                        label="Light Color"
                        colorHex={light.color}
                        paletteOptions={paletteOptions}
                        onColorChange={(value) => light.updateColor(value)}
                    />
                    <FieldLabel>
                        Blend Mode
                        <SelectInput
                            value={light.blendMode}
                            onChange={(e) =>
                                light.updateBlendMode(
                                    e.target.value as "NORMAL" | "ADD",
                                )
                            }
                        >
                            <option value="ADD">ADD</option>
                            <option value="NORMAL">NORMAL</option>
                        </SelectInput>
                    </FieldLabel>
                </InlineFields>
                <FieldLabel>
                    Light Alpha
                    <RangeInput
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={light.alpha}
                        onChange={(e) =>
                            light.updateAlpha(Number(e.target.value))
                        }
                    />
                </FieldLabel>
                <FieldLabel>
                    Light Radius
                    <TextInput
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={light.radiusFactor}
                        onChange={(e) =>
                            light.updateRadiusFactor(Number(e.target.value))
                        }
                    />
                </FieldLabel>
            </>
        ) : null}
    </VisualSection>
);

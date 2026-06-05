import React from "react";
import { Button } from "../../../lib/atoms/button";
import { ALL_GLYPH_SHAPES } from "../../../../data/schemas/assets/GlyphTypes";
import {
    FieldLabel,
    SelectInput,
    TextInput,
} from "../blueprint/visuals/BlueprintVisualsModal.styles";
import { ViewEditorColorField } from "./ViewEditorColorField";
import { ViewEditorGlyphMotionFields } from "./ViewEditorGlyphMotionFields";
import { ViewEditorGlyphPlacementFields } from "./ViewEditorGlyphPlacementFields";
import type { ViewEditorAdapter } from "./ViewEditor.types";

export const ViewEditorGlyphInspector: React.FC<{
    editor: ViewEditorAdapter;
}> = ({ editor }) => {
    const { glyph, projectDefaults } = editor;
    const current = glyph.selectedPlacement;
    const position = glyph.selectedPosition;
    return (
        <>
            <FieldLabel>
                Shape
                <SelectInput
                    title="Choose the glyph shape for the selected slot."
                    value={current.shape}
                    onChange={(e) =>
                        glyph.updateShape(position, e.target.value)
                    }
                >
                    {ALL_GLYPH_SHAPES.map((value) => (
                        <option key={value} value={value}>
                            {value}
                        </option>
                    ))}
                </SelectInput>
            </FieldLabel>
            <ViewEditorColorField
                label="Base Color"
                colorHex={current.colorHex}
                paletteKey={current.paletteColorKey}
                paletteOptions={projectDefaults.paletteOptions}
                paletteHint="Palette swatches override the manual color while active."
                onColorChange={(value) => glyph.updateColor(position, value)}
                onPaletteClear={() => glyph.updatePaletteColor(position, "")}
                onPaletteSelect={(key) =>
                    glyph.updatePaletteColor(position, key)
                }
            />
            <FieldLabel>
                Line Thickness
                <TextInput
                    type="number"
                    min="1"
                    title="Override this display's default line thickness for this slot."
                    placeholder={String(projectDefaults.defaultLineThickness)}
                    value={current.lineThickness ?? ""}
                    onChange={(e) =>
                        glyph.updateLineThickness(
                            position,
                            e.target.value ? Number(e.target.value) : null,
                        )
                    }
                />
            </FieldLabel>
            <ViewEditorGlyphPlacementFields editor={editor} />
            <ViewEditorGlyphMotionFields editor={editor} />
            {current.enabled ? (
                <Button
                    size="sm"
                    title="Remove the selected glyph slot from this display."
                    variant="ghost"
                    onClick={() => glyph.removePlacement(position)}
                >
                    Remove Placement
                </Button>
            ) : null}
        </>
    );
};

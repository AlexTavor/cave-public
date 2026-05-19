import React from "react";
import { Button } from "../../../lib/atoms/button";
import {
    FieldLabel,
    SectionTitle,
    SlotButton,
    SlotGrid,
    TextInput,
    VisualSection,
} from "../blueprint/visuals/BlueprintVisualsModal.styles";
import { ViewEditorGlyphInspector } from "./ViewEditorGlyphInspector";
import type { ViewEditorAdapter } from "./ViewEditor.types";

const POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

export const ViewEditorGlyphSection: React.FC<{
    editor: ViewEditorAdapter;
}> = ({ editor }) => (
    <VisualSection>
        <SectionTitle>Glyph</SectionTitle>
        <FieldLabel>
            Default Line Thickness
            <TextInput
                type="number"
                min="1"
                title="Set the line thickness used by glyph slots without an override."
                value={editor.projectDefaults.defaultLineThickness}
                onChange={(e) =>
                    editor.projectDefaults.updateDefaultLineThickness(
                        Number(e.target.value),
                    )
                }
            />
        </FieldLabel>
        <SlotGrid>
            {POSITIONS.map((position) => (
                <SlotButton
                    key={position}
                    $active={position === editor.glyph.selectedPosition}
                    $filled={editor.glyph.placements.some(
                        (item) => item.position === position,
                    )}
                    title={`Select glyph slot ${position + 1} for editing.`}
                    onClick={() => editor.glyph.selectPosition(position)}
                >
                    {position + 1}
                </SlotButton>
            ))}
        </SlotGrid>
        <Button
            size="sm"
            title="Enable or disable the currently selected glyph slot."
            variant="ghost"
            onClick={() =>
                editor.glyph.togglePlacement(editor.glyph.selectedPosition)
            }
        >
            {editor.glyph.selectedPlacement.enabled
                ? "Disable Slot"
                : "Enable Slot"}
        </Button>
        <ViewEditorGlyphInspector editor={editor} />
    </VisualSection>
);

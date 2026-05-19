import React from "react";
import {
    FieldLabel,
    RangeInput,
} from "../blueprint/visuals/BlueprintVisualsModal.styles";
import type { ViewEditorAdapter } from "./ViewEditor.types";

const POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

export const ViewEditorDelaySection: React.FC<{
    editor: ViewEditorAdapter;
}> = ({ editor }) => (
    <>
        {POSITIONS.map((position) => (
            <FieldLabel key={`delay-${position}`}>
                Delay {position + 1}
                <RangeInput
                    type="range"
                    min="0"
                    max="180"
                    step="1"
                    title={`Delay this slot's pulse start by ${position + 1}.`}
                    value={editor.glyph.delays[position]}
                    onChange={(e) =>
                        editor.glyph.updateDelay(
                            position,
                            Number(e.target.value),
                        )
                    }
                />
            </FieldLabel>
        ))}
    </>
);

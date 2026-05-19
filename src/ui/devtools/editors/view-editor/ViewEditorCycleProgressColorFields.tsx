import { ViewEditorColorField } from "./ViewEditorColorField";
import type { ViewEditorAdapter } from "./ViewEditor.types";

export const ViewEditorCycleProgressColorFields: React.FC<{
    cycleProgress: NonNullable<ViewEditorAdapter["cycleProgress"]>;
    paletteOptions: ViewEditorAdapter["projectDefaults"]["paletteOptions"];
}> = ({ cycleProgress, paletteOptions }) => (
    <ViewEditorColorField
        label="Rope Color"
        colorHex={cycleProgress.color}
        paletteOptions={paletteOptions}
        onColorChange={(value) => cycleProgress.updateColor(value)}
    />
);

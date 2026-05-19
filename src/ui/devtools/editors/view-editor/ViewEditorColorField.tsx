import React from "react";
import type { DisplayPaletteOption } from "../../../../lib/displays/displayKeyKinds";
import {
    HintText,
    SelectInput,
    TextInput,
} from "../blueprint/visuals/BlueprintVisualsModal.styles";
import {
    ColorFieldControls,
    ColorFieldLabel,
    ColorFieldRoot,
    ColorPreview,
} from "./ViewEditorColorField.styles";

interface ViewEditorColorFieldProps {
    label: string;
    colorHex: string;
    paletteOptions: DisplayPaletteOption[];
    paletteKey?: DisplayPaletteOption["key"];
    onColorChange(value: string): void;
    onPaletteSelect?(key: DisplayPaletteOption["key"], color: string): void;
    onPaletteClear?(): void;
    paletteHint?: string;
}
const findPaletteKey = (
    colorHex: string,
    paletteOptions: DisplayPaletteOption[],
) =>
    paletteOptions.find(
        (item) => item.color.toLowerCase() === colorHex.toLowerCase(),
    )?.key;

export const ViewEditorColorField: React.FC<ViewEditorColorFieldProps> = ({
    label,
    colorHex,
    paletteOptions,
    paletteKey,
    onColorChange,
    onPaletteSelect,
    onPaletteClear,
    paletteHint,
}) => {
    const inferredPaletteKey = findPaletteKey(colorHex, paletteOptions);
    const activePaletteKey = paletteKey ?? inferredPaletteKey ?? "";
    const canUsePalette = paletteOptions.length > 0;
    const [source, setSource] = React.useState<"manual" | "palette">(
        canUsePalette && activePaletteKey ? "palette" : "manual",
    );

    React.useEffect(
        () =>
            setSource(canUsePalette && activePaletteKey ? "palette" : "manual"),
        [activePaletteKey, canUsePalette],
    );

    const paletteColor = paletteOptions.find(
        (item) => item.key === activePaletteKey,
    )?.color;
    const effectiveColor =
        source === "palette" ? (paletteColor ?? colorHex) : colorHex;
    const applyPalette = (key: DisplayPaletteOption["key"]) => {
        const option = paletteOptions.find((item) => item.key === key);
        if (!option) return;
        if (onPaletteSelect) onPaletteSelect(option.key, option.color);
        else onColorChange(option.color);
    };

    return (
        <ColorFieldRoot>
            <ColorFieldLabel>{label}</ColorFieldLabel>
            <ColorFieldControls>
                <SelectInput
                    aria-label={`${label} Source`}
                    disabled={!canUsePalette}
                    title={`Choose whether ${label.toLowerCase()} comes from the picker or the project palette.`}
                    value={canUsePalette ? source : "manual"}
                    onChange={(e) => {
                        const next = e.target.value as "manual" | "palette";
                        setSource(next);
                        if (next === "manual") onPaletteClear?.();
                        if (next === "palette" && paletteOptions[0]) {
                            applyPalette(
                                activePaletteKey || paletteOptions[0].key,
                            );
                        }
                    }}
                >
                    <option value="manual">Color Picker</option>
                    {canUsePalette ? (
                        <option value="palette">Palette</option>
                    ) : null}
                </SelectInput>
                {source === "palette" && canUsePalette ? (
                    <SelectInput
                        aria-label={`${label} Palette`}
                        title={`Choose which palette swatch drives ${label.toLowerCase()}.`}
                        value={activePaletteKey || paletteOptions[0].key}
                        onChange={(e) =>
                            applyPalette(
                                e.target.value as DisplayPaletteOption["key"],
                            )
                        }
                    >
                        {paletteOptions.map((item) => (
                            <option key={item.key} value={item.key}>
                                {`${item.key} ${item.color}`}
                            </option>
                        ))}
                    </SelectInput>
                ) : (
                    <TextInput
                        aria-label={`${label} Picker`}
                        type="color"
                        title={`Pick a manual color for ${label.toLowerCase()}.`}
                        value={colorHex}
                        onChange={(e) => onColorChange(e.target.value)}
                    />
                )}
                <ColorPreview $color={effectiveColor} />
            </ColorFieldControls>
            <HintText>
                {source === "palette"
                    ? (paletteHint ?? effectiveColor)
                    : colorHex}
            </HintText>
        </ColorFieldRoot>
    );
};

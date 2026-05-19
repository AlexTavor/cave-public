import React, { useCallback, useMemo } from "react";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";
import {
    readDisplayPaletteOptions,
    type DisplayPaletteKey,
} from "../../../../../../lib/displays/displayKeyKinds";
import {
    RESOURCE_PROGRESS_BAR_POSITION_LABELS,
    RESOURCE_PROGRESS_BAR_POSITIONS,
} from "../../../../../../lib/displays/resourceProgressBarSlots";
import { resolveDefaultResourceProgressBarColor } from "../../../../../../lib/displays/resourceProgressBarColor";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";
import { ViewEditorColorField } from "../../../view-editor/ViewEditorColorField";
import { FieldContainer, Label, Select } from "../../../fields/Shared.styles";
import { useSessionStore } from "../../../../state/useSessionStore";

export const ResourceBarFields: React.FC<{
    filename: string;
    basePath: string;
}> = ({ filename, basePath }) => {
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const current = useSessionStore(
        useCallback(
            (state) =>
                getByPath(state.sessions[filename]?.draft, basePath) as
                    | Record<string, unknown>
                    | undefined,
            [basePath, filename],
        ),
    );
    const displaySettings = useSessionStore(
        useCallback(
            (state) => state.sessions[filename]?.draft.assets?.settings,
            [filename],
        ),
    );
    const paletteOptions = useMemo(
        () => readDisplayPaletteOptions(displaySettings),
        [displaySettings],
    );
    const resource =
        typeof current?.resource === "string" ? current.resource : "";
    const colorHex =
        typeof current?.barColorHex === "string" && current.barColorHex
            ? current.barColorHex
            : resolveDefaultResourceProgressBarColor(resource || "resource");
    const paletteKey =
        typeof current?.barPaletteColorKey === "string"
            ? (current.barPaletteColorKey as DisplayPaletteKey)
            : undefined;
    const position =
        typeof current?.barPosition === "string" ? current.barPosition : "";
    const setValue = useMemo(
        () => (suffix: string, value: unknown) =>
            updateDraft(filename, (draft) =>
                setByPath(draft, `${basePath}.${suffix}`, value),
            ),
        [basePath, filename, updateDraft],
    );

    return (
        <>
            <FieldContainer>
                <SmartTooltip content="Visible resource bars require an explicit slot around the node.">
                    <Label htmlFor={`${basePath}.barPosition`}>
                        Bar Position
                    </Label>
                </SmartTooltip>
                <Select
                    id={`${basePath}.barPosition`}
                    value={position}
                    onChange={(event) =>
                        setValue("barPosition", event.target.value || undefined)
                    }
                >
                    <option value="">Select slot</option>
                    {RESOURCE_PROGRESS_BAR_POSITIONS.map((item) => (
                        <option key={item} value={item}>
                            {RESOURCE_PROGRESS_BAR_POSITION_LABELS[item]}
                        </option>
                    ))}
                </Select>
            </FieldContainer>
            <ViewEditorColorField
                label="Bar Color"
                colorHex={colorHex}
                paletteOptions={paletteOptions}
                paletteKey={paletteKey}
                onColorChange={(value) => {
                    setValue("barPaletteColorKey", undefined);
                    setValue("barColorHex", value);
                }}
                onPaletteClear={() => setValue("barPaletteColorKey", undefined)}
                onPaletteSelect={(key, color) => {
                    setValue("barPaletteColorKey", key);
                    setValue("barColorHex", color);
                }}
                paletteHint="Bars use the selected palette color first and keep the picker color as fallback."
            />
        </>
    );
};

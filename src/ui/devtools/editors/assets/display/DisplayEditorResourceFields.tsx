import React from "react";
import { Input } from "../../fields/Shared.styles";
import type { TransferNodeRadiusByValueRule } from "../../../state/moduleStore.assets";
import { DisplayEditorField } from "./DisplayEditorField";
import { DisplayEditorTransferNodeRadiusSection } from "./DisplayEditorTransferNodeRadiusSection";

export const DisplayEditorResourceFields: React.FC<{
    ids: {
        style: string;
        glyph: string;
        minValue: string;
        minRadius: string;
        maxValue: string;
        maxRadius: string;
    };
    styleId: string;
    glyphKey: string;
    transferNodeRadiusRule: TransferNodeRadiusByValueRule | undefined;
    styleSuggestions: string[];
    glyphSuggestions: string[];
    onStyleIdChange(value: string): void;
    onGlyphKeyChange(value: string): void;
    onTransferNodeRadiusRuleChange(
        value: TransferNodeRadiusByValueRule | undefined,
    ): void;
}> = ({
    ids,
    styleId,
    glyphKey,
    transferNodeRadiusRule,
    styleSuggestions,
    glyphSuggestions,
    onStyleIdChange,
    onGlyphKeyChange,
    onTransferNodeRadiusRuleChange,
}) => (
    <>
        <DisplayEditorField
            controlId={ids.style}
            label="Style ID"
            tooltip="Suggested style ids come from the current module draft. Free-form values are allowed."
        >
            <>
                <Input
                    id={ids.style}
                    list={`${ids.style}-list`}
                    value={styleId}
                    onChange={(e) => onStyleIdChange(e.target.value)}
                    placeholder="e.g. wood"
                />
                <datalist id={`${ids.style}-list`}>
                    {styleSuggestions.map((value) => (
                        <option key={value} value={value} />
                    ))}
                </datalist>
            </>
        </DisplayEditorField>
        <DisplayEditorField
            controlId={ids.glyph}
            label="Glyph Key"
            tooltip="Suggested glyph keys come from the current module draft. Free-form values are allowed."
        >
            <>
                <Input
                    id={ids.glyph}
                    list={`${ids.glyph}-list`}
                    value={glyphKey}
                    onChange={(e) => onGlyphKeyChange(e.target.value)}
                    placeholder="e.g. wood"
                />
                <datalist id={`${ids.glyph}-list`}>
                    {glyphSuggestions.map((value) => (
                        <option key={value} value={value} />
                    ))}
                </datalist>
            </>
        </DisplayEditorField>
        <DisplayEditorTransferNodeRadiusSection
            ids={{
                minValue: ids.minValue,
                minRadius: ids.minRadius,
                maxValue: ids.maxValue,
                maxRadius: ids.maxRadius,
            }}
            rule={transferNodeRadiusRule}
            onChange={onTransferNodeRadiusRuleChange}
        />
    </>
);

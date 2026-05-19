import { ComponentRow } from "../../../../lib/atoms/component-row";
import { EditableTraitId } from "../../config/traits/EditableTraitId";
import { DisplayEditorAttributePoolFields } from "./DisplayEditorAttributePoolFields";
import { DisplayEditorBodyNote } from "./DisplayEditorBodyNote";
import { DisplayEditorResourceFields } from "./DisplayEditorResourceFields";
import type { DisplayEditorDefinitionProps } from "./DisplayEditorSection.types";
import { DisplayEditorTypeField } from "./DisplayEditorTypeField";
import { DisplayEditorViewButton } from "./DisplayEditorViewButton";

export const DisplayEditorDefinitionSection = ({
    assetId,
    editor,
    ids,
}: DisplayEditorDefinitionProps) => (
    <ComponentRow
        title={
            <EditableTraitId traitId={assetId} onRename={editor.handleRename} />
        }
        titleTooltip={`Double-click to rename this display. Current id: ${assetId}`}
        summary={editor.definitionSummary}
        defaultOpen
    >
        <DisplayEditorTypeField
            controlId={ids.type}
            value={editor.draft.type}
            onChange={editor.handleRetype}
        />
        {editor.draft.type === "attribute_pool" && (
            <DisplayEditorAttributePoolFields
                controlId={ids.attribute}
                attribute={editor.draft.attribute}
                onChange={editor.handleAttributeChange}
            />
        )}
        {editor.draft.type === "resource" && (
            <DisplayEditorResourceFields
                ids={{
                    style: ids.style,
                    glyph: ids.glyph,
                    minValue: ids.transferMinValue,
                    minRadius: ids.transferMinRadius,
                    maxValue: ids.transferMaxValue,
                    maxRadius: ids.transferMaxRadius,
                }}
                styleId={editor.draft.styleId}
                glyphKey={editor.draft.glyphKey}
                transferNodeRadiusRule={editor.transferNodeRadiusRule}
                styleSuggestions={editor.styleSuggestions}
                glyphSuggestions={editor.glyphSuggestions}
                onStyleIdChange={editor.handleStyleIdChange}
                onGlyphKeyChange={editor.handleGlyphKeyChange}
                onTransferNodeRadiusRuleChange={
                    editor.handleTransferNodeRadiusRuleChange
                }
            />
        )}
        {editor.draft.type === "body" ? <DisplayEditorBodyNote /> : null}
        <DisplayEditorViewButton
            enabled={editor.canEditView}
            onClick={editor.openViewEditor}
        />
    </ComponentRow>
);

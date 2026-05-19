import { ComponentRow } from "../../../../lib/atoms/component-row";
import { Input, TextArea } from "../../fields/Shared.styles";
import { DisplayEditorField } from "./DisplayEditorField";
import { useDisplayEditor } from "./useDisplayEditor";
import type { ModuleDisplayAsset } from "../../../state/moduleStore.assets";

type EditorState = ReturnType<typeof useDisplayEditor> & {
    draft: ModuleDisplayAsset;
};

export const DisplayEditorMetadataSection = ({
    editor,
    ids,
}: {
    editor: EditorState;
    ids: Record<string, string>;
}) => (
    <ComponentRow
        title="Metadata"
        titleTooltip="Tooltip and tags authored for this display."
        summary={editor.metadataSummary}
        defaultOpen
    >
        <DisplayEditorField
            controlId={ids.tooltip}
            label="Tooltip"
            tooltip="Text shown to players when this display is inspected."
        >
            <TextArea
                id={ids.tooltip}
                value={editor.draft.tooltip ?? ""}
                onChange={(e) => editor.handleTooltipChange(e.target.value)}
                placeholder="Optional tooltip text"
            />
        </DisplayEditorField>
        <DisplayEditorField
            controlId={ids.tags}
            label="Tags"
            tooltip="Comma-separated tags used for search and organization."
        >
            <Input
                id={ids.tags}
                value={editor.tagsText}
                onChange={(e) => editor.handleTagsChange(e.target.value)}
                placeholder="e.g. authored, resource"
            />
        </DisplayEditorField>
    </ComponentRow>
);

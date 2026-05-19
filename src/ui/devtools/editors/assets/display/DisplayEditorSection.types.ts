import type { ModuleDisplayAsset } from "../../../state/moduleStore.assets";
import type { useDisplayEditor } from "./useDisplayEditor";

export interface DisplayEditorIds {
    type: string;
    attribute: string;
    style: string;
    glyph: string;
    transferMinValue: string;
    transferMinRadius: string;
    transferMaxValue: string;
    transferMaxRadius: string;
}

export type DisplayEditorState = ReturnType<typeof useDisplayEditor> & {
    draft: ModuleDisplayAsset;
};

export interface DisplayEditorDefinitionProps {
    assetId: string;
    editor: DisplayEditorState;
    ids: DisplayEditorIds;
}

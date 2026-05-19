import { useShellStore } from "../../../shell/shell";
import { useToastStore } from "../../../toast/toastStore";
import { useSessionStore } from "../../../state/useSessionStore";
import { createAssetScopeId } from "../../../state/moduleSession/scopes";
import {
    ASSET_CATEGORY_DISPLAYS,
    type ModuleDisplayAsset,
    type TransferNodeRadiusByValueRule,
} from "../../../state/moduleStore.assets";
import { useAssetSession } from "../useAssetSession";
import { EMPTY_DISPLAY_RECORD, replaceAsset } from "./displayEditorShared";
import {
    formatDisplayTags,
    getDisplayDefinitionSummary,
    getDisplayMetadataSummary,
    parseDisplayTags,
    retypeDisplayAsset,
} from "./displayEditorHelpers";
import { useDisplayRename } from "./useDisplayRename";
import { applyTransferNodeRadiusRule } from "./useDisplayTransferNodeRadiusRuleChange";

export const useDisplayEditor = ({
    filename,
    assetId,
    tabId,
}: {
    filename: string;
    assetId: string;
    tabId?: string;
}) => {
    const assetSession = useAssetSession({
        filename,
        category: ASSET_CATEGORY_DISPLAYS,
        assetId,
        tabId,
    });
    const { openFile } = useShellStore();
    const updateDraft = useSessionStore((s) => s.updateDraft);
    const updateSessionUi = useSessionStore((s) => s.updateSessionUi);
    const pushToast = useToastStore((s) => s.push);
    const sessionDraft = useSessionStore((s) => s.sessions[filename]?.draft);
    const displays = (sessionDraft?.assets.displays ??
        EMPTY_DISPLAY_RECORD) as Record<string, ModuleDisplayAsset>;
    const styles = sessionDraft?.assets.styles ?? EMPTY_DISPLAY_RECORD;
    const glyphs = sessionDraft?.assets.glyphs ?? EMPTY_DISPLAY_RECORD;
    const draft = assetSession.draft;
    const scopeId = createAssetScopeId("displays", assetId);
    const handleRename = useDisplayRename({
        assetId,
        displays,
        filename,
        openFile,
        pushToast,
        updateDraft,
    });

    const handleTransferNodeRadiusRuleChange = (
        rule?: TransferNodeRadiusByValueRule,
    ) =>
        assetSession.handleChange((current) =>
            applyTransferNodeRadiusRule(current, rule),
        );

    return {
        ...assetSession,
        draft,
        transferNodeRadiusRule:
            draft?.type === "resource"
                ? draft.transferNodeRadiusByValue
                : undefined,
        definitionSummary: draft ? getDisplayDefinitionSummary(draft) : "",
        metadataSummary: draft ? getDisplayMetadataSummary(draft) : "",
        tagsText: formatDisplayTags(draft?.tags),
        canEditView:
            draft?.type === "resource" || draft?.type === "attribute_pool",
        styleSuggestions: Object.keys(styles),
        glyphSuggestions: Object.keys(glyphs),
        handleRename,
        handleRetype: (nextType: ModuleDisplayAsset["type"]) =>
            assetSession.handleChange((current) =>
                replaceAsset(current, retypeDisplayAsset(current, nextType)),
            ),
        handleAttributeChange: (attribute: "body" | "mind" | "social") =>
            assetSession.handleChange((current) => {
                if (current.type === "attribute_pool")
                    current.attribute = attribute;
            }),
        handleStyleIdChange: (styleId: string) =>
            assetSession.handleChange((current) => {
                if (current.type === "resource") current.styleId = styleId;
            }),
        handleGlyphKeyChange: (glyphKey: string) =>
            assetSession.handleChange((current) => {
                if (current.type === "resource") current.glyphKey = glyphKey;
            }),
        handleTransferNodeRadiusRuleChange,
        handleTooltipChange: (tooltip: string) =>
            assetSession.handleChange((current) => {
                current.tooltip = tooltip;
            }),
        handleTagsChange: (nextTagsText: string) =>
            assetSession.handleChange((current) => {
                current.tags = parseDisplayTags(nextTagsText);
            }),
        openViewEditor: () =>
            updateSessionUi(filename, scopeId, (ui) => {
                ui.isVisualsOpen = true;
            }),
        closeViewEditor: () =>
            updateSessionUi(filename, scopeId, (ui) => {
                ui.isVisualsOpen = false;
            }),
    };
};

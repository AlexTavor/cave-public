import React from "react";
import { AutocompleteStringField } from "../../fields/string-field/AutocompleteStringField";
import { tutorialStringSchema } from "./tutorialFieldSchemas";
import { useStructuredConditionTagSuggestions } from "../../conditions/structuredConditionAutocomplete";
import { useSessionStore } from "../../../state/useSessionStore";
import { useShellStore } from "../../../shell/shell";
import {
    deleteByPath,
    getByPath,
    setByPath,
} from "../../../../../utils/objectUtils";
import { createDefaultGuidance } from "../guidances/guidanceEditorDefaults";
import { TutorialGuidanceTargetOverrideFields } from "./TutorialGuidanceTargetOverrideFields";
import {
    getNextGuidanceId,
    GUIDANCES_PATH,
    useSelectedGuidanceDraft,
} from "./tutorialGuidanceRowUtils";
import {
    TutorialNewGuidanceButton,
    TutorialRemoveGuidanceButton,
    TutorialToggleTargetOverrideButton,
} from "./TutorialEditorButtons";
import { TutorialGuidanceOverrideFields } from "./TutorialGuidanceOverrideFields";
import { useNormalizeTutorialGuidanceDraft } from "./useNormalizeTutorialGuidanceDraft";

export const TutorialGuidanceRow: React.FC<{
    filename: string;
    path: string;
    guidanceIds: string[];
    onRemove: () => void;
}> = ({ filename, path, guidanceIds, onRemove }) => {
    const tags = useStructuredConditionTagSuggestions(filename);
    const targetOverride = useSessionStore((state) =>
        getByPath(state.sessions[filename]?.draft, `${path}.targetOverride`),
    );
    const selectedGuidance = useSelectedGuidanceDraft(filename, path);
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const openFile = useShellStore((state) => state.openFile);
    const guidancePresentation = selectedGuidance?.presentation;
    useNormalizeTutorialGuidanceDraft(
        filename,
        path,
        guidancePresentation,
        targetOverride,
        tags,
    );
    const showsDraftOverrides = guidancePresentation === "draft_guidance";
    const showsTitleOverride = guidancePresentation === "modal";
    const allowsOverrides =
        guidancePresentation === undefined ||
        guidancePresentation === "node_callout" ||
        guidancePresentation === "screen_callout" ||
        guidancePresentation === "modal";
    const addGuidance = () => {
        const nextId = getNextGuidanceId(guidanceIds);
        updateDraft(filename, (draft) => {
            const current =
                (getByPath(draft, GUIDANCES_PATH) as
                    | Array<{ id: string }>
                    | undefined) ?? [];
            setByPath(draft, GUIDANCES_PATH, [
                ...current,
                createDefaultGuidance(nextId),
            ]);
            setByPath(draft, `${path}.guidanceId`, nextId);
        });
        openFile(`guidances::${filename}`);
    };
    const setOverrideEnabled = (enabled: boolean) =>
        updateDraft(filename, (draft) => {
            if (!enabled) return deleteByPath(draft, `${path}.targetOverride`);
            setByPath(draft, `${path}.targetOverride`, {
                kind: "entity_id",
                entityId: "sys_world",
            });
        });

    return (
        <>
            <AutocompleteStringField
                label="Guidance ID"
                schema={tutorialStringSchema}
                filename={filename}
                path={`${path}.guidanceId`}
                suggestions={guidanceIds}
                tooltip="Choose which authored guidance definition this tutorial step should use."
            />
            <TutorialNewGuidanceButton onClick={addGuidance} />
            <TutorialGuidanceOverrideFields
                filename={filename}
                path={path}
                showTitleOverride={showsTitleOverride}
                showTextOverride={allowsOverrides}
            />
            {allowsOverrides ? (
                <TutorialToggleTargetOverrideButton
                    enabled={targetOverride != null}
                    onClick={() => setOverrideEnabled(!targetOverride)}
                />
            ) : null}
            <TutorialGuidanceTargetOverrideFields
                filename={filename}
                path={path}
                targetOverride={showsDraftOverrides ? null : targetOverride}
                tags={tags}
            />
            <TutorialRemoveGuidanceButton onClick={onRemove} />
        </>
    );
};

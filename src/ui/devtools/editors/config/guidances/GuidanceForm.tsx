import React from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import { EnumField } from "../../fields/enum-field/EnumField";
import { StringField } from "../../fields/string-field/StringField";
import { getByPath } from "../../../../../utils/objectUtils";
import { useSessionStore } from "../../../state/useSessionStore";
import { EditableTraitId } from "../traits/EditableTraitId";
import {
    guidancePresentationSchema,
    guidanceStringSchema,
} from "./guidanceFieldSchemas";
import { GuidanceAttentionList } from "./GuidanceAttentionList";
import { GuidanceSubtypeFields } from "./GuidanceSubtypeFields";
import { ModalGuidanceContentFields } from "./ModalGuidanceContentFields";
import { useNormalizeGuidanceDraft } from "./useNormalizeGuidanceDraft";
import { useStructuredConditionTagSuggestions } from "../../conditions/structuredConditionAutocomplete";

export const GuidanceForm: React.FC<{
    filename: string;
    index: number;
    onRemove: () => void;
    onRename: (index: number, id: string) => string | null;
}> = ({ filename, index, onRemove, onRename }) => {
    const basePath = `config.settings.guidances.${index}`;
    const guidance = useSessionStore((state) =>
        getByPath(state.sessions[filename]?.draft, basePath),
    );
    const tags = useStructuredConditionTagSuggestions(filename);
    useNormalizeGuidanceDraft(filename, basePath, guidance, tags);
    const showsVisualFields =
        guidance?.presentation === undefined ||
        guidance.presentation === "node_callout" ||
        guidance.presentation === "screen_callout" ||
        guidance.presentation === "modal";
    const attentionSuggestions =
        guidance?.presentation === "node_callout"
            ? [
                  "stop_time",
                  "hide_time_controls",
                  "hide_notifications",
                  "hide_all_but_self",
                  "show_attention_effect_on_self",
              ]
            : ["stop_time", "hide_time_controls", "hide_notifications"];
    const summary =
        guidance?.presentation === "draft_guidance"
            ? guidance.targetOptionId?.trim() || "Empty"
            : guidance?.text?.trim() || "Empty";

    return (
        <ComponentRow
            title={
                <EditableTraitId
                    traitId={guidance?.id ?? `guidance_${index + 1}`}
                    onRename={(next) => onRename(index, next)}
                />
            }
            icon={<span>G</span>}
            summary={summary}
            onDelete={onRemove}
            deleteLabel="Remove guidance"
        >
            <EnumField
                label="Presentation"
                schema={guidancePresentationSchema}
                filename={filename}
                path={`${basePath}.presentation`}
            />
            <GuidanceSubtypeFields
                filename={filename}
                basePath={basePath}
                presentation={guidance?.presentation}
                tags={tags}
            />
            {showsVisualFields && guidance?.presentation !== "modal" ? (
                <StringField
                    label="Text"
                    schema={guidanceStringSchema}
                    filename={filename}
                    path={`${basePath}.text`}
                    forceTextArea
                />
            ) : null}
            {guidance?.presentation === "modal" ? (
                <ModalGuidanceContentFields
                    filename={filename}
                    basePath={basePath}
                />
            ) : null}
            {showsVisualFields && guidance?.presentation !== "modal" ? (
                <StringField
                    label="Image URL"
                    schema={guidanceStringSchema}
                    filename={filename}
                    path={`${basePath}.imageUrl`}
                />
            ) : null}
            <GuidanceAttentionList
                filename={filename}
                path={`${basePath}.attention`}
                suggestions={attentionSuggestions}
            />
        </ComponentRow>
    );
};

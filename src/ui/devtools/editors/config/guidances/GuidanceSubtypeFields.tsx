import React from "react";
import { EnumField } from "../../fields/enum-field/EnumField";
import { AutocompleteStringField } from "../../fields/string-field/AutocompleteStringField";
import { StringField } from "../../fields/string-field/StringField";
import { getByPath } from "../../../../../utils/objectUtils";
import { useSessionStore } from "../../../state/useSessionStore";
import { useDraftOptionIdSuggestions } from "../../draft/useDraftReferenceSuggestions";
import {
    guidanceNodeSlotSchema,
    guidanceScreenSlotSchema,
    guidanceStringSchema,
    guidanceTargetKindSchema,
} from "./guidanceFieldSchemas";

export const GuidanceSubtypeFields: React.FC<{
    filename: string;
    basePath: string;
    presentation: string | undefined;
    tags: string[];
}> = ({ filename, basePath, presentation, tags }) => {
    const targetKind = useSessionStore(
        (state) =>
            getByPath(
                state.sessions[filename]?.draft,
                `${basePath}.target.kind`,
            ) as "entity_id" | "entity_tag" | undefined,
    );
    const draftOptionIds = useDraftOptionIdSuggestions(filename);
    if (presentation === "node_callout") {
        return (
            <>
                <EnumField
                    label="Target Kind"
                    schema={guidanceTargetKindSchema}
                    filename={filename}
                    path={`${basePath}.target.kind`}
                    tooltip="Choose whether this callout targets a specific entity id or the first entity with a tag."
                />
                {targetKind === "entity_tag" ? (
                    <AutocompleteStringField
                        label="Target Tag"
                        schema={guidanceStringSchema}
                        filename={filename}
                        path={`${basePath}.target.tag`}
                        suggestions={tags}
                        tooltip="Match the first runtime entity with this tag when the guidance resolves."
                    />
                ) : (
                    <StringField
                        label="Target ID"
                        schema={guidanceStringSchema}
                        filename={filename}
                        path={`${basePath}.target.entityId`}
                        tooltip="Pin this guidance to a specific runtime entity id."
                    />
                )}
                <EnumField
                    label="Node Slot"
                    schema={guidanceNodeSlotSchema}
                    filename={filename}
                    path={`${basePath}.slot`}
                    tooltip="Choose where the callout sits relative to the targeted node."
                />
            </>
        );
    }
    if (presentation === "screen_callout") {
        return (
            <EnumField
                label="Screen Slot"
                schema={guidanceScreenSlotSchema}
                filename={filename}
                path={`${basePath}.screenSlot`}
                tooltip="Choose the viewport anchor used for this screen-level tutorial callout."
            />
        );
    }
    if (presentation === "draft_guidance") {
        return (
            <AutocompleteStringField
                label="Target Option ID"
                schema={guidanceStringSchema}
                filename={filename}
                path={`${basePath}.targetOptionId`}
                suggestions={draftOptionIds}
                tooltip="Restrict the guided draft to this authored option id when the tutorial is active."
            />
        );
    }
    return null;
};

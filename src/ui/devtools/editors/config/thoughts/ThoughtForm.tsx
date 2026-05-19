import React from "react";
import { Card } from "../../../../lib/atoms/card";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import { RichText } from "../../../../lib/atoms/rich-text/RichText";
import { EnumField } from "../../fields/enum-field/EnumField";
import { StringField } from "../../fields/string-field/StringField";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath } from "../../../../../utils/objectUtils";
import { EditableTraitId } from "../traits/EditableTraitId";
import { thoughtScopeSchema, thoughtStringSchema } from "./thoughtFieldSchemas";
import { StructuredConditionsField } from "../../conditions/StructuredConditionsField";

interface Props {
    filename: string;
    index: number;
    onRemove: () => void;
    onRename: (index: number, id: string) => string | null;
}

export const ThoughtForm: React.FC<Props> = ({
    filename,
    index,
    onRemove,
    onRename,
}) => {
    const basePath = `config.settings.thoughts.${index}`;
    const thought = useSessionStore((state) =>
        getByPath(state.sessions[filename]?.draft, basePath),
    );
    const thoughtId = thought?.id ?? `thought-${index + 1}`;
    const summary =
        thought?.body
            ?.split("\n")
            .find((line: string) => line.trim())
            ?.trim() ?? "Empty";

    return (
        <ComponentRow
            title={
                <EditableTraitId
                    traitId={thoughtId}
                    onRename={(next) => onRename(index, next)}
                />
            }
            titleTooltip={`Double-click to rename this thought. Current id: ${thoughtId}`}
            icon={<span>T</span>}
            summary={summary}
            onDelete={onRemove}
            deleteLabel="Remove this thought and all of its conditions."
        >
            <EnumField
                label="Remember Scope"
                schema={thoughtScopeSchema}
                filename={filename}
                path={`${basePath}.rememberScope`}
                tooltip="Choose where the seen-memory for this thought is stored. Run resets on rebirth; permanent survives rebirth."
            />
            <StringField
                label="Body"
                schema={thoughtStringSchema}
                filename={filename}
                path={`${basePath}.body`}
                forceTextArea
                tooltip="Narrative text shown in the fullscreen thought modal. Supports the same rich text markup used elsewhere in the game."
            />
            <Card variant="transparent" padding="md">
                <RichText text={thought?.body ?? ""} variant="narration" />
            </Card>
            <StructuredConditionsField
                filename={filename}
                path={`${basePath}.conditions`}
            />
        </ComponentRow>
    );
};

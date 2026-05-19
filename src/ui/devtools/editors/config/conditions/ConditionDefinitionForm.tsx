import React from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import { StringField } from "../../fields/string-field/StringField";
import { StructuredConditionsField } from "../../conditions/StructuredConditionsField";
import { EditableTraitId } from "../traits/EditableTraitId";
import { z } from "zod";
import { ConditionSelfDefinitionField } from "./ConditionSelfDefinitionField";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath } from "../../../../../utils/objectUtils";

const schema = z.string();

export const ConditionDefinitionForm: React.FC<{
    filename: string;
    index: number;
    id: string;
    onDelete: () => void;
    onRename: (index: number, id: string) => string | null;
}> = ({ filename, index, id, onDelete, onRename }) => {
    const basePath = `config.settings.conditions.${index}`;
    const kind = useSessionStore(
        (state) =>
            (getByPath(
                state.sessions[filename]?.draft,
                `${basePath}.selfDefinition.kind`,
            ) as string | undefined) ?? "auto",
    );
    return (
        <ComponentRow
            title={
                <EditableTraitId
                    traitId={id}
                    onRename={(next) => onRename(index, next)}
                />
            }
            icon={<span>C</span>}
            summary="Condition definition"
            onDelete={onDelete}
            deleteLabel="Remove condition definition"
        >
            <StringField
                label="Label"
                schema={schema}
                filename={filename}
                path={`${basePath}.label`}
            />
            <ConditionSelfDefinitionField
                filename={filename}
                basePath={basePath}
                kind={kind}
            />
            <StructuredConditionsField
                filename={filename}
                path={`${basePath}.conditions`}
                label="Conditions"
                tooltip="All conditions are ANDed."
                addButtonLabel="+ Add Condition"
            />
        </ComponentRow>
    );
};

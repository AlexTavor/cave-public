import React from "react";
import { z } from "zod";
import { Button } from "../../../../../lib/atoms/button";
import { EnumField } from "../../../fields/enum-field/EnumField";
import { AutocompleteStringField } from "../../../fields/string-field/AutocompleteStringField";
import { StringField } from "../../../fields/string-field/StringField";
import { usePassportParentField } from "./usePassportParentField";

const parentKindSchema = z.enum(["entity_tag", "entity_id"]);
const stringSchema = z.string();

export const PassportParentField: React.FC<{
    filename: string;
    basePath: string;
}> = ({ filename, basePath }) => {
    const {
        addParent,
        removeParent,
        handleKindChange,
        hasParent,
        kind,
        parentPath,
        tagSuggestions,
    } = usePassportParentField(filename, basePath);

    if (!hasParent) {
        return (
            <Button size="sm" variant="ghost" onClick={addParent}>
                Add Parent
            </Button>
        );
    }

    return (
        <>
            <EnumField
                label="Parent Match"
                schema={parentKindSchema}
                filename={filename}
                path={`${parentPath}.kind`}
                tooltip="Choose whether spawned entities resolve their parent by runtime entity tag or id."
                onValueChange={handleKindChange}
            />
            {kind === "entity_tag" ? (
                <AutocompleteStringField
                    label="Parent Tag"
                    schema={stringSchema}
                    filename={filename}
                    path={`${parentPath}.tag`}
                    suggestions={tagSuggestions}
                    tooltip="Resolve the first runtime entity whose tags include this value."
                />
            ) : (
                <StringField
                    label="Parent ID"
                    schema={stringSchema}
                    filename={filename}
                    path={`${parentPath}.entityId`}
                    tooltip="Resolve a specific runtime entity id when this blueprint spawns."
                />
            )}
            <Button size="sm" variant="ghost" onClick={removeParent}>
                Remove Parent
            </Button>
        </>
    );
};

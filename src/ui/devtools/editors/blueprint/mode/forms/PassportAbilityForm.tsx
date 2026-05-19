import React from "react";
import { z } from "zod";
import { useBlueprintContext } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { Button } from "../../../../../lib/atoms/button";
import { BooleanField } from "../../../fields/boolean-field/BooleanField";
import { StringField } from "../../../fields/string-field/StringField";
import { PassportDisplayKeyField } from "./PassportDisplayKeyField";
import { PassportParentField } from "./PassportParentField";

const stringSchema = z.string();
const booleanSchema = z.boolean();

interface PassportAbilityFormProps {
    rootPath: string;
}

export const PassportAbilityForm: React.FC<PassportAbilityFormProps> = ({
    rootPath,
}) => {
    const { filename, blueprintId, scopeId } = useBlueprintContext();
    const basePath = `${rootPath}._editor.abilities.passport`;
    const blueprint = useSessionStore(
        (state) => state.sessions[filename]?.draft.blueprints?.[blueprintId],
    );
    const updateSessionUi = useSessionStore((state) => state.updateSessionUi);
    const isBodyBlueprint = blueprint?.tags.includes("body") ?? false;

    return (
        <>
            <StringField
                label="Label"
                schema={stringSchema}
                filename={filename}
                path={`${basePath}.label`}
                tooltip="Display name for the entity."
            />
            <PassportDisplayKeyField
                label="Display Key"
                filename={filename}
                path={`${basePath}.icon`}
                tooltip="Optional authored display key override. Leave empty to use the blueprint id."
            />
            <StringField
                label="Description"
                schema={stringSchema}
                filename={filename}
                path={`${basePath}.description`}
                tooltip="Optional description text."
            />
            <BooleanField
                label="Nervous Vein"
                schema={booleanSchema}
                filename={filename}
                path={`${basePath}.nervousVein`}
                tooltip="Route a nervous vein from sys_world through this entity's parent chain."
            />
            <BooleanField
                label="Permanent"
                schema={booleanSchema}
                filename={filename}
                path={`${basePath}.permanent`}
                tooltip="Carry this entity's current state and physics through rebirth."
            />
            <PassportParentField filename={filename} basePath={basePath} />
            {!isBodyBlueprint && (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                        updateSessionUi(filename, scopeId, (ui) => {
                            ui.isVisualsOpen = true;
                        })
                    }
                >
                    Edit Visuals
                </Button>
            )}
        </>
    );
};


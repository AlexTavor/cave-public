import React from "react";
import { useBlueprintContext } from "../../BlueprintContext";
import { SchemaForm } from "../../../SchemaForm";
import { BodyAbilitySchema } from "../../../../../../data/schemas/abilities/body";

interface BodyAbilityFormProps {
    rootPath: string;
}

export const BodyAbilityForm: React.FC<BodyAbilityFormProps> = ({
    rootPath,
}) => {
    const { filename } = useBlueprintContext();
    const basePath = `${rootPath}._editor.abilities.body`;

    return (
        <SchemaForm
            schema={BodyAbilitySchema}
            filename={filename}
            rootPath={basePath}
        />
    );
};

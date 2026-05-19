import React from "react";
import { useBlueprintContext } from "../../BlueprintContext";
import { ModalGuidanceContentFields } from "../../../config/guidances/ModalGuidanceContentFields";

interface NotificationAbilityFormProps {
    basePath: string;
}

export const NotificationAbilityForm: React.FC<
    NotificationAbilityFormProps
> = ({ basePath }) => {
    const { filename } = useBlueprintContext();

    return (
        <ModalGuidanceContentFields filename={filename} basePath={basePath} />
    );
};


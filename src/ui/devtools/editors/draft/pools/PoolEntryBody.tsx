import React from "react";
import { z } from "zod";
import { StringField } from "../../fields/string-field/StringField";
import { EnumField } from "../../fields/enum-field/EnumField";
import { IconPicker } from "../../fields/icon-picker/IconPicker";
import { ActionListEditor } from "../options/ActionListEditor";
import { DraftConditionReferenceList } from "../options/DraftConditionReferenceList";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { Button } from "../../../../lib/atoms/button/Button";

interface PoolEntryBodyProps {
    filename: string;
    optionId: string;
    onRemove: () => void;
}

export const PoolEntryBody: React.FC<PoolEntryBodyProps> = ({
    filename,
    optionId,
    onRemove,
}) => {
    const rootPath = `draftOptions.${optionId}`;

    return (
        <>
            <StringField
                label="Title"
                schema={z.string()}
                filename={filename}
                path={`${rootPath}.title`}
                tooltip="Display name shown during draft selection"
            />
            <StringField
                label="Description"
                schema={z.string()}
                filename={filename}
                path={`${rootPath}.description`}
                forceTextArea
                tooltip="Flavour text shown on the draft card"
            />
            <EnumField
                label="Rarity"
                schema={z.enum(["none", "common", "rare", "legendary"])}
                filename={filename}
                path={`${rootPath}.rarity`}
                tooltip="Visual rarity tier for the draft card"
            />
            <IconPicker
                label="Icon"
                schema={z.string()}
                filename={filename}
                path={`${rootPath}.icon`}
                tooltip="Icon displayed on the draft card"
            />
            <DraftConditionReferenceList
                filename={filename}
                path={`${rootPath}.conditionIds`}
            />
            <ActionListEditor filename={filename} optionId={optionId} />
            <SmartTooltip content="Remove this option from the draft pool">
                <Button size="sm" variant="ghost" onClick={onRemove}>
                    Remove from pool
                </Button>
            </SmartTooltip>
        </>
    );
};


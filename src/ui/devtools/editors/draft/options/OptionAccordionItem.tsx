import React from "react";
import { z } from "zod";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import { GameIcon } from "../../../../lib/atoms/game-icon";
import { StringField } from "../../fields/string-field/StringField";
import { EnumField } from "../../fields/enum-field/EnumField";
import { IconPicker } from "../../fields/icon-picker/IconPicker";
import { useDraftOptionSlice } from "../../../state/moduleSession";
import { EditableOptionIdField } from "./EditableOptionIdField";
import { ActionListEditor } from "./ActionListEditor";
import { DraftConditionReferenceList } from "./DraftConditionReferenceList";

interface OptionAccordionItemProps {
    filename: string;
    optionId: string;
    onDelete: (optionId: string) => void;
    onRename: (oldId: string, newId: string) => string | null;
}

export const OptionAccordionItem: React.FC<OptionAccordionItemProps> = ({
    filename,
    optionId,
    onDelete,
    onRename,
}) => {
    const option = useDraftOptionSlice(filename, optionId);

    if (!option) return null;

    const rootPath = `draftOptions.${optionId}`;
    const payloadCount = option.payload?.length ?? 0;

    return (
        <ComponentRow
            title={option.title || optionId}
            icon={<GameIcon id={option.icon || "unknown"} />}
            summary={`${payloadCount} actions`}
            onDelete={() => onDelete(optionId)}
            deleteLabel="Delete"
        >
            <EditableOptionIdField
                optionId={option.id}
                onRename={(newId) => onRename(optionId, newId)}
            />
            <StringField
                label="Title"
                schema={z.string()}
                filename={filename}
                path={`${rootPath}.title`}
            />
            <StringField
                label="Description"
                schema={z.string()}
                filename={filename}
                path={`${rootPath}.description`}
                forceTextArea
            />
            <EnumField
                label="Rarity"
                schema={z.enum(["none", "common", "rare", "legendary"])}
                filename={filename}
                path={`${rootPath}.rarity`}
            />
            <IconPicker
                label="Icon"
                schema={z.string()}
                filename={filename}
                path={`${rootPath}.icon`}
            />
            <DraftConditionReferenceList
                filename={filename}
                path={`${rootPath}.conditionIds`}
            />
            <ActionListEditor filename={filename} optionId={optionId} />
        </ComponentRow>
    );
};


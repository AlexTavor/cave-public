import React, { useCallback } from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import { SliderField } from "../../fields/number-field/SliderField";
import { StringField } from "../../fields/string-field/StringField";
import { Button } from "../../../../lib/atoms/button";
import { Label } from "../../fields/Shared.styles";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { MILESTONES_PATH } from "./usePurgeMilestonesSession";
import { z } from "zod";
import { PurgeMilestoneSchema } from "../../../../../data/schemas/game/config";

interface Props {
    filename: string;
    index: number;
    milestoneId: string;
    onRemove: () => void;
}

const thresholdSlider = { min: 0, max: 1, step: 0.01 };
const thresholdSchema = PurgeMilestoneSchema.shape.threshold;
const idSchema = z.string();
const EMPTY_MESSAGES: string[] = [];

export const PurgeMilestoneForm: React.FC<Props> = ({
    filename,
    index,
    milestoneId,
    onRemove,
}) => {
    const basePath = `${MILESTONES_PATH}.${index}`;
    const messagesPath = `${basePath}.messages`;

    const messages = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                const value = getByPath(session?.draft, messagesPath);
                return Array.isArray(value)
                    ? (value as string[])
                    : EMPTY_MESSAGES;
            },
            [filename, messagesPath],
        ),
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);

    const addMessage = useCallback(() => {
        updateDraft(filename, (draft) => {
            const current = getByPath(draft, messagesPath);
            const next = Array.isArray(current)
                ? [...(current as string[]), ""]
                : [""];
            setByPath(draft, messagesPath, next);
        });
    }, [filename, messagesPath, updateDraft]);

    const removeMessage = useCallback(
        (messageIndex: number) => {
            updateDraft(filename, (draft) => {
                const current = getByPath(draft, messagesPath);
                const next = Array.isArray(current)
                    ? [...(current as string[])]
                    : [];
                next.splice(messageIndex, 1);
                setByPath(draft, messagesPath, next);
            });
        },
        [filename, messagesPath, updateDraft],
    );

    return (
        <ComponentRow
            title={milestoneId}
            titleTooltip={`Milestone: ${milestoneId}`}
            icon={<span>📍</span>}
            defaultOpen={false}
            onDelete={onRemove}
            deleteLabel="Remove Milestone"
        >
            <StringField
                label="ID"
                schema={idSchema}
                filename={filename}
                path={`${basePath}.id`}
                tooltip="Unique identifier for this milestone."
            />
            <SliderField
                label="Threshold"
                schema={thresholdSchema}
                filename={filename}
                path={`${basePath}.threshold`}
                sliderMeta={thresholdSlider}
                tooltip="The fraction of total purge progress required to trigger this narrative event."
            />
            <Label>Messages</Label>
            {messages.map((_, messageIndex) => (
                <div
                    key={`${basePath}.messages.${messageIndex}`}
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                >
                    <div style={{ flex: 1 }}>
                        <StringField
                            label={`Message ${messageIndex + 1}`}
                            schema={idSchema}
                            filename={filename}
                            path={`${messagesPath}.${messageIndex}`}
                            tooltip="A pool of messages. One will be randomly selected when the threshold is reached."
                        />
                    </div>
                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() => removeMessage(messageIndex)}
                    >
                        Remove
                    </Button>
                </div>
            ))}
            <Button size="sm" variant="ghost" onClick={addMessage}>
                + Add Message
            </Button>
        </ComponentRow>
    );
};

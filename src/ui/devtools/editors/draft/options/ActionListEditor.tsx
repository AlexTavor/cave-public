import React from "react";
import { Button } from "../../../../lib/atoms/button/Button";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { ActionInput } from "./ActionInput";
import { formatBehaviorAction } from "./actionText";
import { useActionListEditor } from "./useActionListEditor";
import { ActionRow, ActionText, List } from "./ActionListEditor.styles";

export interface ActionListEditorProps {
    filename: string;
    optionId: string;
}

export const ActionListEditor: React.FC<ActionListEditorProps> = ({
    filename,
    optionId,
}) => {
    const { payload, input, setInput, addFromInput, removeAction, error } =
        useActionListEditor(filename, optionId);

    return (
        <div>
            <List>
                {payload.map((action, index) => (
                    <ActionRow key={`${action.type}-${index}`}>
                        <ActionText>{formatBehaviorAction(action)}</ActionText>
                        <SmartTooltip content="Remove this action from the payload">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeAction(index)}
                            >
                                Remove
                            </Button>
                        </SmartTooltip>
                    </ActionRow>
                ))}
            </List>
            <ActionInput
                value={input}
                onChange={setInput}
                onCommit={addFromInput}
                error={error}
            />
        </div>
    );
};

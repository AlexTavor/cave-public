import React, { useCallback, useState } from "react";
import type { BehaviorAction } from "../../../../../../data/schemas/behavior";
import { getByPath, setByPath } from "../../../../../../utils/objectUtils";
import { Button } from "../../../../../lib/atoms/button/Button";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";
import { compileActionSequence } from "../../../../editors/behaviors/compiler";
import { ActionInput } from "../../../../editors/draft/options/ActionInput";
import { formatBehaviorAction } from "../../../../editors/draft/options/actionText";
import {
    ActionRow,
    ActionText,
    List,
} from "../../../../editors/draft/options/ActionListEditor.styles";
import { useSessionStore } from "../../../../state/useSessionStore";
import { FieldContainer, Label } from "../../../fields/Shared.styles";

interface BehaviorActionArrayFieldProps {
    filename: string;
    path: string;
    label: string;
    tooltip?: string;
}

const EMPTY_ACTIONS: BehaviorAction[] = [];

export const BehaviorActionArrayField: React.FC<
    BehaviorActionArrayFieldProps
> = ({ filename, path, label, tooltip }) => {
    const payload = useSessionStore(
        useCallback(
            (state) => {
                const value = getByPath(state.sessions[filename]?.draft, path);
                return Array.isArray(value)
                    ? (value as BehaviorAction[])
                    : EMPTY_ACTIONS;
            },
            [filename, path],
        ),
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const [input, setInput] = useState("");
    const [error, setError] = useState<string | null>(null);

    const setPayload = useCallback(
        (next: BehaviorAction[]) => {
            updateDraft(filename, (draft) => setByPath(draft, path, next));
        },
        [filename, path, updateDraft],
    );
    const addFromInput = useCallback(
        (value: string) => {
            try {
                setPayload([...payload, ...compileActionSequence(value)]);
                setInput("");
                setError(null);
            } catch (nextError) {
                setError((nextError as Error).message);
            }
        },
        [payload, setPayload],
    );

    return (
        <FieldContainer>
            {tooltip ? (
                <SmartTooltip content={tooltip}>
                    <Label>{label}</Label>
                </SmartTooltip>
            ) : (
                <Label>{label}</Label>
            )}
            <List>
                {payload.map((action, index) => (
                    <ActionRow key={`${action.type}-${index}`}>
                        <ActionText>{formatBehaviorAction(action)}</ActionText>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                                setPayload(
                                    payload.filter((_, i) => i !== index),
                                )
                            }
                        >
                            Remove
                        </Button>
                    </ActionRow>
                ))}
            </List>
            <ActionInput
                value={input}
                onChange={setInput}
                onCommit={addFromInput}
                error={error}
            />
        </FieldContainer>
    );
};

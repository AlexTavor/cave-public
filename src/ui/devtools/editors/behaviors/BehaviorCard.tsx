import React from "react";
import { Button } from "../../../lib/atoms/button/Button";
import type { BehaviorItem } from "./types";
import { BehaviorInput } from "./BehaviorInput";
import { useBehaviorCard } from "./useBehaviorCard";
import {
    Card,
    KindBadge,
    Meta,
    Sentence,
    EditPanel,
    EditActions,
} from "./BehaviorCard.styles";

export interface BehaviorCardProps {
    item: BehaviorItem;
    onDelete: (item: BehaviorItem) => void;
    onUpdate: (item: BehaviorItem, sentence: string) => void;
}

const toneForKind = (kind: BehaviorItem["kind"]): "behavior" => kind;

export const BehaviorCard: React.FC<BehaviorCardProps> = ({
    item,
    onDelete,
    onUpdate,
}) => {
    const {
        isEditing,
        draftSentence,
        setDraftSentence,
        startEdit,
        cancelEdit,
        handleSave,
    } = useBehaviorCard(item, onUpdate);

    if (isEditing) {
        return (
            <Card>
                <EditPanel>
                    <BehaviorInput
                        initialValue={draftSentence}
                        submitLabel="Save"
                        onSubmit={handleSave}
                        onValueChange={setDraftSentence}
                    />
                    <EditActions>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            Cancel
                        </Button>
                    </EditActions>
                </EditPanel>
            </Card>
        );
    }

    return (
        <Card>
            <Sentence title={item.sentence}>{item.sentence}</Sentence>
            <Meta>
                <KindBadge tone={toneForKind(item.kind)}>{item.kind}</KindBadge>
                <Button size="sm" variant="ghost" onClick={startEdit}>
                    Edit
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(item)}
                >
                    Remove
                </Button>
            </Meta>
        </Card>
    );
};

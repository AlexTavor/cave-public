import { useCallback, useEffect, useState } from "react";
import type { BehaviorItem } from "./types";

export const useBehaviorCard = (
    item: BehaviorItem,
    onUpdate: (item: BehaviorItem, sentence: string) => void,
) => {
    const [isEditing, setIsEditing] = useState(false);
    const [draftSentence, setDraftSentence] = useState(item.sentence);

    useEffect(() => {
        if (!isEditing) {
            setDraftSentence(item.sentence);
        }
    }, [isEditing, item.sentence]);

    const startEdit = useCallback(() => setIsEditing(true), []);
    const cancelEdit = useCallback(() => setIsEditing(false), []);

    const handleSave = useCallback(
        (sentence: string) => {
            onUpdate(item, sentence);
            setIsEditing(false);
        },
        [item, onUpdate],
    );

    return {
        isEditing,
        draftSentence,
        setDraftSentence,
        startEdit,
        cancelEdit,
        handleSave,
    };
};

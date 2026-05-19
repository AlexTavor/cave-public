import React, { useEffect } from "react";
import { Modal } from "../../lib/atoms/modal/Modal";
import { Card } from "../../lib/atoms/card";
import { RichText } from "../../lib/atoms/rich-text/RichText";
import { DraftCard } from "./DraftCard";
import {
    CardGrid,
    OverlayContent,
    OverlayStack,
    OverlayTitle,
} from "./DraftOverlay.styles";
import { useDraftState } from "./useDraftState";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { useActiveDraftGuidanceTargetOptionId } from "../tutorials/useActiveDraftGuidanceTargetOptionId";

export const DraftOverlay: React.FC = () => {
    const { draft, selectOption } = useDraftState();
    const pause = useRuntimeStore((s) => s.pause);
    const runtime = useRuntimeStore((s) => s.runtime);
    const targetOptionId = useActiveDraftGuidanceTargetOptionId();

    useEffect(() => {
        if (draft?.active && !draft.selectedOptionId) {
            pause();
            runtime?.flushCommands();
        }
    }, [draft, pause, runtime]);

    if (!draft?.active) return null;

    const targetExists = Boolean(
        targetOptionId &&
        draft.options.some((option) => option.id === targetOptionId),
    );

    return (
        <Modal isOpen>
            <OverlayContent padding="xl">
                <OverlayStack onClick={(e) => e.stopPropagation()}>
                    <OverlayTitle>{draft.sourceLabel || "Draft"}</OverlayTitle>
                    {draft.currentText.trim().length > 0 ? (
                        <Card variant="transparent" padding="md">
                            <RichText
                                text={draft.currentText}
                                variant="narration"
                            />
                        </Card>
                    ) : null}
                    <CardGrid>
                        {draft.options.map((option) => (
                            <DraftCard
                                key={option.id}
                                disabled={
                                    targetExists && option.id !== targetOptionId
                                }
                                option={option}
                                onSelect={() => selectOption(option.id)}
                            />
                        ))}
                    </CardGrid>
                </OverlayStack>
            </OverlayContent>
        </Modal>
    );
};


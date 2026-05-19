import React, { useEffect } from "react";
import { Modal } from "../../lib/atoms/modal/Modal";
import { Card } from "../../lib/atoms/card";
import { Button } from "../../lib/atoms/button";
import { RichText } from "../../lib/atoms/rich-text/RichText";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { useThoughtState } from "./useThoughtState";
import { ThoughtActions, ThoughtOverlayBody } from "./ThoughtOverlay.styles";

export const ThoughtOverlay: React.FC = () => {
    const { thought, continueThought } = useThoughtState();
    const pause = useRuntimeStore((state) => state.pause);

    useEffect(() => {
        if (thought?.active) pause();
    }, [thought, pause]);

    if (!thought?.active) return null;

    return (
        <Modal isOpen>
            <ThoughtOverlayBody>
                <Card variant="transparent" padding="lg">
                    <RichText text={thought.body} variant="narration" />
                </Card>
                <ThoughtActions>
                    <Button onClick={continueThought}>CONTINUE</Button>
                </ThoughtActions>
            </ThoughtOverlayBody>
        </Modal>
    );
};

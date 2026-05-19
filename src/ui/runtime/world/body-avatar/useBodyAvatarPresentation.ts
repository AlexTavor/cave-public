import { useEffect, useState } from "react";
import {
    resolveBodyAvatarPresentation,
    type BodyAvatarPresentation,
} from "../../../../engine/phaser/avatar/bodyAvatarBridge";

export const useBodyAvatarPresentation = (
    subjectId: string | undefined,
): BodyAvatarPresentation | null => {
    const [presentation, setPresentation] =
        useState<BodyAvatarPresentation | null>(() =>
            subjectId ? resolveBodyAvatarPresentation(subjectId) : null,
        );

    useEffect(() => {
        if (!subjectId) {
            setPresentation(null);
            return;
        }
        const initial = resolveBodyAvatarPresentation(subjectId);
        if (initial) {
            setPresentation(initial);
            return;
        }
        let frameId = 0;
        const tick = () => {
            const next = resolveBodyAvatarPresentation(subjectId);
            if (next) {
                setPresentation(next);
                return;
            }
            frameId = requestAnimationFrame(tick);
        };
        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [subjectId]);

    return presentation;
};

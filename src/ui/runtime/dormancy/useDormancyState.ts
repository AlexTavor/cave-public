import { useCallback, useMemo } from "react";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { useWorldInteraction } from "../world/context/WorldInteractionContext";
import { useEntitySelector } from "../world/selection/useEntitySelector";
import { useRuntimeStore } from "../state/useRuntimeStore";

interface DormancySnapshot {
    attributes: { body: number; mind: number; social: number };
    progression: { xp: number; level: number; skillpoints: number };
}

const DEFAULT_ATTRS = { body: 10, mind: 10, social: 10 };
const DEFAULT_PROG = { xp: 0, level: 1, skillpoints: 0 };

const extractDormancy = (entity: any): DormancySnapshot | null => {
    if (entity?.state?.dormant?.value !== 1) return null;
    return {
        attributes: entity?.cave?.attributes ?? DEFAULT_ATTRS,
        progression: entity?.cave?.progression ?? DEFAULT_PROG,
    };
};

const isEqual = (
    a: DormancySnapshot | null | undefined,
    b: DormancySnapshot | null | undefined,
): boolean => (a === null) === (b === null);

export const useDormancyState = () => {
    const { runtime } = useWorldInteraction();
    const pause = useRuntimeStore((s) => s.pause);
    const play = useRuntimeStore((s) => s.play);

    const snapshot = useEntitySelector(
        runtime,
        "sys_world",
        extractDormancy,
        isEqual,
    );

    const awaken = useCallback(() => {
        if (!runtime || !snapshot) return;
        runtime.commands.enqueue({
            type: RuntimeCommandType.AWAKEN_CAVE,
            payload: {
                attributes: snapshot.attributes,
                progression: snapshot.progression,
            },
        });
        play();
    }, [runtime, snapshot, play]);

    return useMemo(
        () => ({ snapshot, awaken, pause }),
        [snapshot, awaken, pause],
    );
};


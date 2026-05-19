import { useCallback, useMemo } from "react";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import type { ThoughtComponent } from "../../../engine/runtime/components/ThoughtComponent";
import { useWorldInteraction } from "../world/context/WorldInteractionContext";
import { useEntitySelector } from "../world/selection/useEntitySelector";
import { useRuntimeStore } from "../state/useRuntimeStore";

const getThoughtKey = (thought: ThoughtComponent | null) =>
    thought
        ? `${thought.active}:${thought.thoughtId ?? ""}:${thought.body}:${thought.resumeStatus}`
        : "none";

export const useThoughtState = () => {
    const { runtime } = useWorldInteraction();
    const play = useRuntimeStore((state) => state.play);

    const thought = useEntitySelector(
        runtime,
        "sys_world",
        (entity) => entity.thought ?? null,
        (left, right) =>
            getThoughtKey(left ?? null) === getThoughtKey(right ?? null),
    );

    const continueThought = useCallback(() => {
        if (!runtime || !thought?.active || !thought.thoughtId) return;
        runtime.commands.enqueue({
            type: RuntimeCommandType.ACKNOWLEDGE_THOUGHT,
            payload: { thoughtId: thought.thoughtId },
        });
        runtime.flushCommands();
        if (thought.resumeStatus === "running") play();
    }, [runtime, thought, play]);

    return useMemo(
        () => ({ thought: thought ?? null, continueThought }),
        [thought, continueThought],
    );
};

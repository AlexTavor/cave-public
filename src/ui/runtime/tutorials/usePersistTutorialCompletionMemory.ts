import { useEffect } from "react";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { useEntitySelector } from "../world/selection/useEntitySelector";
import { persistTutorialCompletionMemory } from "./tutorialCompletionMemory";

const sameValues = (left: any, right: any) =>
    JSON.stringify(left ?? {}) === JSON.stringify(right ?? {});

export const usePersistTutorialCompletionMemory = () => {
    const runtime = useRuntimeStore((state) => state.runtime);
    const values =
        useEntitySelector(
            runtime,
            "sys_world",
            (entity) =>
                (
                    entity as {
                        permanent?: {
                            tutorial_completed?: Record<string, number>;
                        };
                    }
                ).permanent?.tutorial_completed ?? null,
            sameValues,
        ) ?? null;

    useEffect(() => {
        if (!values) return;
        persistTutorialCompletionMemory(values);
    }, [values]);
};

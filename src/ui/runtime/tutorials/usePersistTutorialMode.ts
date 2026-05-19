import { useEffect } from "react";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { useEntitySelector } from "../world/selection/useEntitySelector";
import {
    persistTutorialMode,
    readTutorialModeValue,
} from "./tutorialModeMemory";

export const usePersistTutorialMode = () => {
    const runtime = useRuntimeStore((state) => state.runtime);
    const tutorialMode = useEntitySelector(
        runtime,
        "sys_world",
        (world) => readTutorialModeValue(world),
        (left, right) => left === right,
    );

    useEffect(() => {
        if (tutorialMode == null) return;
        persistTutorialMode(tutorialMode);
    }, [tutorialMode]);
};

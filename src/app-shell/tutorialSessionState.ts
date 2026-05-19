import {
    extractTutorialCompletionMemory,
    restoreTutorialCompletionMemory,
} from "../ui/runtime/tutorials/tutorialCompletionMemory";
import {
    extractTutorialMode,
    restoreTutorialMode,
} from "../ui/runtime/tutorials/tutorialModeMemory";

export type TutorialSessionState = {
    completionMemory: Record<string, number>;
    mode: 0 | 1;
};

export const captureTutorialSessionState = (
    runtime: unknown,
): TutorialSessionState => ({
    completionMemory: extractTutorialCompletionMemory(runtime as any),
    mode: extractTutorialMode(runtime as any),
});

export const restoreTutorialSessionState = (
    runtime: unknown,
    state: TutorialSessionState,
): void => {
    restoreTutorialCompletionMemory(runtime as any, state.completionMemory);
    restoreTutorialMode(runtime as any, state.mode);
};

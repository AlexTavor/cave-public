export type TutorialCompletion =
    | { kind: "completed"; tutorialId: string; selfId: string }
    | { kind: "invalid"; tutorialId: string; error: string };

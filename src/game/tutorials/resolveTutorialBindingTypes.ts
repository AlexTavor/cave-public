import type { ResolvedBinding } from "./resolveTutorialBindingUtils";

export type ResolvedTutorialBindings = {
    kind: "resolved";
    bindings: ResolvedBinding[];
    primaryTargetId: string | null;
    selfId: string;
};

export type DeferredTutorialBindings = { kind: "defer" };

export type TutorialBindingError = { kind: "error"; error: string };

export type TutorialBindingResolution =
    | ResolvedTutorialBindings
    | DeferredTutorialBindings
    | TutorialBindingError;

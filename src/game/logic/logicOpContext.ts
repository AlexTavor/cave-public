import type { Snapshot } from "../../engine/runtime/Snapshot";

/**
 * The slice of the JsonLogic evaluation data that json-logic-js binds as `this`
 * inside a game op. JsonLogicAdapter.evaluate injects `__snapshot` (the world
 * snapshot) and `self` (the current entity facade); these are the only fields
 * the game ops read.
 */
export type LogicOpContext = {
    __snapshot?: Snapshot;
    self?: { id?: string };
};

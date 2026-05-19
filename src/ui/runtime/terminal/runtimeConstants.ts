import z from "zod";

export const TICK_KEY = "Tick";
export const RUNTIME_KEY = "Runtime";
export const STATUS_KEY = "Status";
export const AUTOMATIONS_KEY = "Automations";
export const NEXT_AUTOMATION_KEY = "Next Automation";
export const AUTOMATION_COMMAND_KEY = "Automation Command";

export const tickStepSchema = z.array(z.string()).max(0);
export const tickRunSchema = z.array(z.string()).max(0);
export const tickStopSchema = z.array(z.string()).max(0);
export const logTestSchema = z.array(z.string().min(1)).min(1);
export const runtimeReloadSchema = z.array(z.string()).max(0);
export const gameSpawnSchema = z.array(z.string().min(1)).min(1).max(2);
export const gameKillSchema = z.array(z.string().min(1)).min(1).max(1);
export const gameKillAllBodiesExceptSchema = z
    .array(z.coerce.number().int().nonnegative())
    .length(1);
export const gameEntitiesSchema = z.array(z.string()).max(0);
export const gamePositionSchema = z.array(z.string().min(1)).min(3).max(3);
export const gameAbsorbSchema = z.array(z.string().min(1)).min(1);
export const transferStartSchema = z.array(z.string().min(1)).min(4).max(4);
export const transferCancelSchema = z.array(z.string().min(1)).min(1).max(1);
export const dispatchBodySchema = z.array(z.string().min(1)).min(2).max(2);
export const recallBodySchema = z.array(z.string().min(1)).min(1).max(1);
export const absorbBatchSchema = z.array(z.string().min(1)).min(1).max(1);
export const setTargetSchema = z.array(z.string().min(1)).min(1).max(2);
export const runSchema = z.array(z.string().min(1)).min(1).max(1);
export const repeatSchema = z.array(z.string().min(1)).min(3);
export const balancingScanSchema = z.array(z.string().min(1)).min(1).max(1);
export const loadSchema = z.array(z.string().min(1)).min(1).max(1);
export const gameRebirthSchema = z.array(z.string()).max(1);
export const tutorialModeSchema = z.array(z.string().min(1)).length(1);

export const buildInvalidArgsResult = (command: string) => ({
    type: "error" as const,
    content: `Invalid arguments for ${command}.`,
});


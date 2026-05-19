import type { Snapshot } from "../../../engine/runtime/Snapshot";
import {
    RuntimeCommandType,
    type RuntimeCommand,
} from "../../../engine/runtime/types";
import {
    RUN_NUMBER_FACT_ABOUT,
    RUN_NUMBER_FACT_TYPE,
} from "../../../game/facts/runNumberFact";
import { runStartCycleBannerStore } from "./runStartCycleBannerStore";

const isRunStartCommand = (command: RuntimeCommand) =>
    command.type === RuntimeCommandType.ADJUST_FACT &&
    command.payload.scope === "run" &&
    command.payload.factType === RUN_NUMBER_FACT_TYPE &&
    command.payload.factAbout === RUN_NUMBER_FACT_ABOUT;

export const evaluateRunStartCycleBannerCommands = (
    commands: RuntimeCommand[],
    current: Snapshot,
) => {
    if (!commands.some(isRunStartCommand)) return;
    const world = current.getEntity("sys_world") as
        | { run?: Record<string, { world?: number }> }
        | undefined;
    const runNumber = world?.run?.[RUN_NUMBER_FACT_TYPE]?.world;
    if (
        typeof runNumber !== "number" ||
        !Number.isFinite(runNumber) ||
        runNumber <= 0
    )
        return;
    runStartCycleBannerStore.getState().show(runNumber);
};

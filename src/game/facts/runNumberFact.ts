import type { CommandBuffer, RuntimeCommand } from "../../engine/runtime/types";
import { enqueueFactAdjust } from "./factCommands";

export const RUN_NUMBER_FACT_TYPE = "run_number";
export const RUN_NUMBER_FACT_ABOUT = "world";

export const resolvePreviousRunNumber = (value: unknown): number =>
    typeof value === "number" && Number.isFinite(value) && value > 0
        ? value
        : 0;

export const enqueueRunNumberBootstrap = (
    commands: CommandBuffer<RuntimeCommand>,
    previousRunNumber: unknown,
) => {
    const nextRunNumber = resolvePreviousRunNumber(previousRunNumber) + 1;
    enqueueFactAdjust(
        commands,
        "run",
        RUN_NUMBER_FACT_TYPE,
        RUN_NUMBER_FACT_ABOUT,
        nextRunNumber,
    );
    enqueueFactAdjust(
        commands,
        "permanent",
        RUN_NUMBER_FACT_TYPE,
        RUN_NUMBER_FACT_ABOUT,
        1,
    );
    return nextRunNumber;
};

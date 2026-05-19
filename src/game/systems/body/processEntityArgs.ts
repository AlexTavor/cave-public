import type { Passport } from "../../../data/schemas/game/body";
import type { AttributeTotals } from "./attributes";
import type { ProcessBodyEntityOptions } from "./processEntityOptions";
import type { TraitIndex } from "./traits";

export type ProcessBodyArgs =
    | [ProcessBodyEntityOptions]
    | [
          number,
          AttributeTotals,
          TraitIndex,
          Record<string, number>,
          (Partial<Passport> | null)?,
          (string[] | null)?,
      ];

export const resolveProcessBodyOptions = (
    args: ProcessBodyArgs,
): ProcessBodyEntityOptions => {
    if (typeof args[0] === "object" && "caveAttributes" in args[0]) {
        return args[0];
    }
    const [
        healthMultiplier,
        caveAttributes,
        traitIndex,
        globals,
        passportPatch,
        habitusPatch,
    ] = args as Exclude<ProcessBodyArgs, [ProcessBodyEntityOptions]>;
    return {
        healthMultiplier,
        caveAttributes,
        traitIndex,
        globals,
        passportPatch,
        habitusPatch,
    };
};

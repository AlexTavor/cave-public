import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import { readKnownHabiti } from "../../../../game/habiti/knownHabiti";

const readRuntimeEntities = (runtime: Runtime | null): RuntimeEntity[] =>
    runtime && typeof runtime.getEntities === "function"
        ? (runtime.getEntities() as RuntimeEntity[])
        : [];

export const readRuntimeKnownHabiti = (runtime: Runtime | null): string[] =>
    readKnownHabiti(
        (runtime?.getEntity("sys_world") as RuntimeEntity | undefined) ??
            undefined,
        readRuntimeEntities(runtime),
    );

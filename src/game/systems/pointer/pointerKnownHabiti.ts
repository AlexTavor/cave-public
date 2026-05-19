import type { RuntimeEntity } from "../../../engine/runtime/types";
import { readKnownHabiti } from "../../habiti/knownHabiti";

export const readKnownPickupHabiti = (entity: RuntimeEntity | undefined) =>
    readKnownHabiti(entity);

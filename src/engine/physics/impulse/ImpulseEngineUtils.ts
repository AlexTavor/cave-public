import { stringHash } from "../../../utils/deterministicHash";
import type { PhysicsBody } from "./types";

export const isHardAnchored = (body: PhysicsBody): boolean =>
    body.anchor?.type === "entity" && body.anchor.mode === "hard";

export const ensureBodyDefaults = (body: PhysicsBody): void => {
    if (!body.layer) {
        body.layer = "default";
    }

    body.seed ??= stringHash(String(body.id));
};

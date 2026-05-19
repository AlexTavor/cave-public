import type { Runtime } from "../Runtime";
import type { SaveGameData, SerializedCameraState } from "./types";
import { serializeFlyweightEntity } from "./flyweightPersistence";
import { serializePhysicsBody } from "./physicsBodyPersistence";

const SAVE_VERSION = "2";

const extractPhysics = (runtime: Runtime, entityIds: string[]) =>
    entityIds.reduce<Record<string, SaveGameData["state"]["physics"][string]>>(
        (physics, id) => {
            const body = serializePhysicsBody(runtime, id);
            if (body) physics[id] = body;
            return physics;
        },
        {},
    );

export const serialize = (
    runtime: Runtime,
    label: string,
    manifestPath?: string,
    cameraState?: SerializedCameraState,
): SaveGameData => {
    const state = runtime.getState();
    const entities = runtime
        .getEntities()
        .map((entity) => serializeFlyweightEntity(runtime, entity));
    const entityIds = entities.map((e) => e.id).filter(Boolean) as string[];

    return {
        metadata: {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            label,
            seed: state.seed,
            manifestPath,
        },
        state: {
            tick: state.tick,
            timeScale: 1,
            entities,
            physics: extractPhysics(runtime, entityIds),
            systems: {
                automation: runtime.getAutomationSnapshot(),
            },
            ...(cameraState ? { camera: cameraState } : {}),
        },
    };
};


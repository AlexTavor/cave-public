import type { Runtime } from "../../runtime/Runtime";
import type { RuntimeEntity } from "../../runtime/types";
import { coerceBlueprintId } from "../../runtime/blueprintId";
import { resolveDisplaySpec } from "../display/resolve-display/resolveDisplaySpec";
import { resolveAvatarSubjectSeed } from "../display/avatar/AvatarSeedResolver";
import type { AvatarAppearance } from "../display/avatar/AvatarDisplayTypes";
import { BODY_AVATAR_DISPLAY_KEY } from "../display/avatar/AvatarDisplayConstants";
import type { GameScene } from "../scenes/GameScene";

export interface BodyAvatarExportInputs {
    runtime: Runtime;
    runtimeSeed: string;
    entity: RuntimeEntity;
    subjectSeed: string;
    glyphKey: string | null;
    appearance: AvatarAppearance;
}

const fail = (message: string): never => {
    console.error(message);
    throw new Error(message);
};

export const resolveBodyAvatarExportInputs = (
    scene: GameScene,
    entityId: string,
): BodyAvatarExportInputs => {
    const runtime =
        scene.readRuntime() ??
        fail("[DisplayImageExport] Missing active runtime.");
    const displaySystem =
        scene.displaySystem ??
        fail("[DisplayImageExport] Missing display system.");
    if (!scene.textureManager)
        fail("[DisplayImageExport] Missing texture manager.");
    const entity =
        runtime.getEntity(entityId) ??
        fail(`[DisplayImageExport] Missing body entity: ${entityId}`);
    const blueprintId =
        coerceBlueprintId(entity.blueprintId) ??
        fail(`[DisplayImageExport] Missing blueprint id: ${entityId}`);
    const blueprint = runtime.getCartridge().blueprints[blueprintId];
    const runtimeSeed = runtime.getState().seed;
    displaySystem.glyphRegistry.syncEpoch(
        runtimeSeed,
        runtime.getCartridge().assets?.glyphs,
        runtime.getCartridge().assets?.settings,
    );
    displaySystem.avatarRegistry.syncEpoch(runtimeSeed);
    const spec =
        resolveDisplaySpec({
            entity,
            blueprint,
            physics: null,
            styles: runtime.getCartridge().assets?.styles ?? {},
            displays: runtime.getCartridge().assets?.displays ?? {},
            blueprints: runtime.getCartridge().blueprints,
        }) ?? fail(`[DisplayImageExport] Missing display spec: ${entityId}`);
    if (spec.display_key !== BODY_AVATAR_DISPLAY_KEY) {
        fail(`[DisplayImageExport] Expected body_avatar for ${entityId}.`);
    }
    const subjectSeed =
        resolveAvatarSubjectSeed(entity, runtime) ??
        fail(`[DisplayImageExport] Empty subject seed: ${entityId}`);
    return {
        runtime,
        runtimeSeed,
        entity,
        subjectSeed,
        glyphKey: null,
        appearance: displaySystem.avatarRegistry.resolve(subjectSeed),
    };
};

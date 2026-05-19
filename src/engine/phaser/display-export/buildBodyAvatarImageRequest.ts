import { BODY_AVATAR_DISPLAY_KEY } from "../display/avatar/AvatarDisplayConstants";
import { AvatarAppearanceRegistry } from "../display/avatar/AvatarAppearanceRegistry";
import { resolveAvatarSubjectSeed } from "../display/avatar/AvatarSeedResolver";
import { resolveDisplaySpec } from "../display/resolve-display/resolveDisplaySpec";
import type { Runtime } from "../../runtime/Runtime";
import { coerceBlueprintId } from "../../runtime/blueprintId";
import type { BodyAvatarImageRequest } from "./DisplayImageExportTypes";

const avatarRegistry = new AvatarAppearanceRegistry();

const fail = (message: string): never => {
    console.error(message);
    throw new Error(message);
};

export const buildBodyAvatarImageRequest = (params: {
    subjectId: string;
    runtime: Runtime | null;
}): BodyAvatarImageRequest => {
    const runtime =
        params.runtime ?? fail("[DisplayImageExport] Missing runtime.");
    const entity =
        runtime.getEntity(params.subjectId) ??
        fail(`[DisplayImageExport] Missing body entity: ${params.subjectId}`);
    const blueprintId =
        coerceBlueprintId(entity.blueprintId) ??
        fail(`[DisplayImageExport] Missing blueprint id: ${params.subjectId}`);
    const cartridge = runtime.getCartridge();
    const spec =
        resolveDisplaySpec({
            entity,
            blueprint: cartridge.blueprints[blueprintId],
            physics: null,
            styles: cartridge.assets?.styles ?? {},
            displays: cartridge.assets?.displays ?? {},
            blueprints: cartridge.blueprints,
        }) ??
        fail(`[DisplayImageExport] Missing display spec: ${params.subjectId}`);
    if (spec.display_key !== BODY_AVATAR_DISPLAY_KEY) {
        fail(
            `[DisplayImageExport] Expected body_avatar for ${params.subjectId}.`,
        );
    }
    const subjectSeed =
        resolveAvatarSubjectSeed(entity, runtime) ??
        fail(`[DisplayImageExport] Empty subject seed: ${params.subjectId}`);
    avatarRegistry.syncEpoch(runtime.getState().seed);
    return {
        kind: "body_avatar",
        subjectSeed,
        glyphKey: null,
        appearance: avatarRegistry.resolve(subjectSeed),
        glyphs: null,
        renderSeed: runtime.getState().seed,
    };
};

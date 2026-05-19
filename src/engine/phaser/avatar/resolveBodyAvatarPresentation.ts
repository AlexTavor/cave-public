import type Phaser from "phaser";
import type { Runtime } from "../../runtime/Runtime";
import type { TextureManager } from "../utils/TextureManager";
import { resolveAvatarSubjectSeed } from "../display/avatar/AvatarSeedResolver";
import type { AvatarAppearanceRegistry } from "../display/avatar/AvatarAppearanceRegistry";
import type { BodyAvatarPresentation } from "./bodyAvatarBridge";
import { buildBodyAvatarPresentation } from "./buildBodyAvatarPresentation";

const cache = new Map<string, BodyAvatarPresentation>();

export const resolveBodyAvatarPresentation = (
    subjectId: string,
    _textureManager: TextureManager,
    avatarRegistry: AvatarAppearanceRegistry,
    _scene: Phaser.Scene,
    runtime: Runtime | null,
): BodyAvatarPresentation | null => {
    try {
        const runtimeSeed = runtime?.getState().seed;
        if (runtimeSeed) avatarRegistry.syncEpoch(runtimeSeed);
        const entity = runtime?.getEntity(subjectId);
        const subjectSeed = entity
            ? resolveAvatarSubjectSeed(entity, runtime)
            : subjectId;
        const appearance = avatarRegistry.resolve(subjectSeed ?? subjectId);
        const cached = cache.get(appearance.appearanceKey);
        if (cached) return cached;
        const presentation = buildBodyAvatarPresentation(appearance);
        cache.set(appearance.appearanceKey, presentation);
        return presentation;
    } catch {
        return null;
    }
};

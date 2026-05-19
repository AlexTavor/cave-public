import {
    type DisplayImageRequest,
    type DisplayImageExportService as DisplayImageExportServiceContract,
} from "./DisplayImageExportTypes";
import { buildDisplayCacheKey } from "./buildDisplayImageCacheKey";
import type { DisplayRenderHostScene } from "./DisplayRenderHostScene";
import { resolveDisplayImageSpec } from "./resolveDisplayImageSpec";
import { renderAttributeDisplayImage } from "./renderAttributeDisplayImage";
import { renderBodyAvatarImage } from "./renderBodyAvatarImage";
import { renderResolvedDisplayImage } from "./renderResolvedDisplayImage";
import { syncDisplayHostGlyphs } from "./syncDisplayHostGlyphs";

export class DisplayImageExportService implements DisplayImageExportServiceContract {
    private readonly canvas = document.createElement("canvas");
    private readonly cache = new Map<string, string>();
    private readonly inFlight = new Map<string, Promise<string>>();

    constructor(private readonly scene: DisplayRenderHostScene) {}

    public getImageUrl(request: DisplayImageRequest): Promise<string> {
        try {
            const spec = resolveDisplayImageSpec(request);
            const key = buildDisplayCacheKey(spec);
            return this.resolveCached(key, () =>
                Promise.resolve().then(() => {
                    if (spec.kind === "body_avatar") {
                        syncDisplayHostGlyphs(
                            this.scene,
                            spec.renderSeed,
                            spec.glyphs,
                        );
                        this.scene.avatarRegistry.syncEpoch(spec.renderSeed);
                        return renderBodyAvatarImage(
                            this.scene,
                            spec,
                            this.canvas,
                        );
                    }
                    if (spec.kind === "attribute_display") {
                        return renderAttributeDisplayImage(
                            this.scene,
                            spec.displayKey,
                            this.canvas,
                        );
                    }
                    syncDisplayHostGlyphs(
                        this.scene,
                        spec.renderSeed,
                        spec.glyphs,
                    );
                    return renderResolvedDisplayImage({
                        scene: this.scene,
                        canvas: this.canvas,
                        displayKey: spec.displayKey,
                        glyphKey: spec.glyphKey ?? spec.displayKey,
                        style: spec.style,
                        paletteColors: spec.paletteColors,
                        defaultLineThickness: spec.defaultLineThickness,
                    });
                }),
            );
        } catch (error) {
            return Promise.reject(error);
        }
    }

    public clear(): void {
        this.cache.clear();
        this.inFlight.clear();
    }

    private resolveCached(
        key: string,
        build: () => Promise<string>,
    ): Promise<string> {
        const cached = this.cache.get(key);
        if (cached) return Promise.resolve(cached);
        const pending = this.inFlight.get(key);
        if (pending !== undefined) return pending;
        const task = build().then(
            (url) => {
                this.cache.set(key, url);
                this.inFlight.delete(key);
                return url;
            },
            (error) => {
                this.inFlight.delete(key);
                throw error;
            },
        );
        this.inFlight.set(key, task);
        return task;
    }
}

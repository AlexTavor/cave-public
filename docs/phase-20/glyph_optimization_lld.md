Low-Level Design
Glyph Rendering Optimization and Baked Glow

Scope: Phaser glyph rendering only.

Design constraints: Context Pack v1, Prompt Contract, Testing Standards.

| Field | Definition |
| --- | --- |
| Objective | Reduce glyph rendering cost without changing glyph motion semantics, blueprint schema, or display-spec APIs. |
| Locked decisions | No bucketing. No pulse model rewrite. No schema changes. No new UI logic. Baked glow must be uniform, directional artifacts are not allowed. |
| Primary causes in current code | Per-frame preset parsing in GlyphRegistry.syncEpoch; three image layers per slot in GlyphModule and TransferGlyphModule; per-frame additive glow composition; repeated property writes during glyph tick. |
| Existing propagation path to preserve | TextureManager.getGlyphTexture is already the single glyph texture entrypoint used by node glyphs, transfer glyphs, progress bar icons, and display export. |

# 1. Why this design exists

- GlyphRegistry.syncEpoch currently calls parsePresets before it decides whether the epoch actually changed. Because DisplayInstanceManager.tick calls syncDisplayEpochs every frame, the preset parse path is currently frame-loop work.
- GlyphModule currently allocates three image groups for every glyph instance: outer glow, inner glow, and base. The module therefore creates 27 pooled images for a full 9-slot glyph even though only one visual layer is logically required after glow is baked into the texture.
- transferGlyphRuntime repeats the same pattern for transfer visuals: two glow images plus one base image per slot, plus per-frame texture and blend updates.
- TextureManager.getGlyphTexture is already the shared runtime/export path. Keeping that contract lets the baked-glow change automatically reach node glyphs, transfer glyphs, progress bar icons, and display-image export without adding new call sites.
# 2. Scope and non-goals

| Field | Definition |
| --- | --- |
| In scope | Glyph texture generation, glyph registry epoch synchronization, node glyph runtime rendering, transfer glyph runtime rendering, and the tests that define those contracts. |
| Explicitly out of scope | Bucketing, pulse timing changes, transform math changes, background rendering, UI store subscriptions, blueprint or asset schema changes, and unrelated tech-debt cleanup. |
| Visual contract | Every glyph texture produced by the glyph texture generator uses the same baked glow recipe. Glow is radial and smooth. There are no separate runtime glow layers. |
| Compatibility contract | The public signatures of TextureManager.getGlyphTexture, GlyphRegistry.get, GlyphRegistry.syncEpoch, createGlyphModule, createTransferGlyphModule, and resolveGlyphPlacementRenderModel remain unchanged. |

# 3. Design summary

1. Move glow from runtime composition to texture synthesis. Each generated glyph texture contains the glow and the core shape in one texture.
2. Collapse glyph instance rendering from three images per slot to one image per slot in both GlyphModule and TransferGlyphModule.
3. Add a no-op fast path to GlyphRegistry.syncEpoch so the frame loop does not re-parse presets when seed, glyph asset object reference, and effective default thickness are unchanged.
4. Retain the current transform and pulse model. The design changes only texture synthesis, image allocation, and redundant per-frame work.
5. Reuse the existing TextureManager.getGlyphTexture path so unchanged callers inherit the baked-glow behavior automatically.
# 4. Exact glow contract

- Texture size remains 128 px. No runtime scale compensation is introduced.
- The baked glow recipe is versioned. The texture cache key must include the glow recipe version so recipe changes cannot reuse stale textures.
- Maximum glow outset is 8 px. This fits within the current glyph art margin because the existing draw geometry uses a 54 px outer extent inside a 128 px texture, leaving 10 px of headroom from the center to the edge.
- Glow color matches the texture color argument. For callers that tint the image at runtime, the baked glow is tinted together with the core, preserving a single-color glyph contract.
- Glow falloff is produced by eight deterministic passes, ordered outer to inner. Passes use outset values 8, 7, 6, 5, 4, 3, 2, 1 px. Alpha values are fixed to 0.012, 0.018, 0.026, 0.036, 0.048, 0.062, 0.078, and 0.096 respectively. The opaque core is drawn after all glow passes.
- There is no directional stamp pattern and no additive blend mode in the runtime glyph path after this change.
# 5. Unchanged callers that inherit the new behavior

- src/engine/phaser/display-export/renderResolvedDisplayImage.ts remains unchanged. It already resolves glyph instructions and then requests textures from TextureManager.getGlyphTexture. Exported display icons therefore pick up the baked glow automatically.
- src/engine/phaser/display/modules/progressBarIcon.ts remains unchanged for the same reason. Progress bar icons continue to use TextureManager.getGlyphTexture and therefore render the same glyph recipe.
- resolveGlyphPlacementRenderModel remains unchanged. The optimization does not alter glyph placement order, pulse sampling, or transform outputs.
# 6. File-by-file design

## src/engine/phaser/display/glyph/GlyphRegistry.ts

Responsibility: Own glyph epoch state, lazy glyph materialization, and the preset/procedural cache.

Logic:

- Add stored references for the last presets object and the last settings object.
- In syncEpoch, read the effective default line thickness first. If seed, presets object reference, and effective default thickness are unchanged, return immediately without calling parsePresets and without clearing caches.
- Only call parsePresets when the seed changed or the presets object reference changed.
- Changing the effective default thickness without changing presets still invalidates the cache because line thickness affects generated textures and runtime render instructions.
- The fast path relies on runtime cartridge assets being immutable during a runtime. That matches the project contract: structure is not mutated in place during a run.
Interface / contract:

- Public signature remains syncEpoch(seed: string, presetsRaw: unknown, settingsRaw?: unknown): void.
- Public signature remains get(display_key: string): GlyphConfig.
- Idempotent frame-loop calls with identical input references must not allocate, must not parse, and must preserve previously returned cached GlyphConfig object identities.
## src/engine/phaser/display/glyph/GlyphGlowStyle.ts

Responsibility: Define the canonical baked glow recipe and its version.

Logic:

- Replace runtime-layer constants with baked-glow constants only.
- Define GLYPH_GLOW_VERSION = "v2".
- Define the ordered baked glow pass descriptors exactly as specified in Section 4.
- Define GLYPH_GLOW_MAX_OUTSET_PX = 8 to keep the recipe within the current 128 px texture bounds.
Interface / contract:

- Exports are data only. No Phaser dependency is introduced.
- Every glyph texture key built after this change must incorporate GLYPH_GLOW_VERSION.
## src/engine/phaser/display/glyph/glyphGlowMath.ts

Responsibility: Provide pure helpers derived from the baked glow recipe.

Logic:

- Replace computeGlowScale with resolveGlyphGlowPasses or an equivalent pure helper that returns the outer-to-inner pass list exactly once and without runtime mutation.
- The helper returns only numeric pass descriptors: outsetPx and alpha.
- No scene, graphics, or texture dependencies are allowed in this file.
Interface / contract:

- Exports a deterministic readonly pass list or deterministic accessor for that list.
- The returned order is outer to inner and is stable across calls.
## src/engine/phaser/display/glyph/glyphTextureDrawCore.ts

Responsibility: Draw the opaque filled core silhouette for any filled glyph shape and draw filled glow silhouettes for the same family of shapes.

Logic:

- Extend the drawing contract to accept an outsetPx argument and the requested color so shapes can be rendered larger for glow passes without duplicating shape logic in GlyphTextureGen.
- The file must handle all filled shapes required by the current GlyphShape union that are rendered as filled geometry, including circle, pixel, triangle, star variants, crescent, plus_rounded, and triple_circle.
- For crescent, the black cut-out remains part of the core shape definition; the function must restore the requested color after the cut-out operation rather than restoring white unconditionally.
Interface / contract:

- Return boolean handled/not-handled exactly as today so GlyphTextureGen can continue to compose core and stroke drawers predictably.
- New effective signature contract: drawCoreGlyphShape(graphics, shape, thickness, color, outsetPx): boolean.
## src/engine/phaser/display/glyph/glyphTextureDrawStroke.ts

Responsibility: Draw the opaque stroked/open core silhouette and stroked glow silhouettes for line and outline glyphs.

Logic:

- Extend the drawing contract to accept outsetPx.
- For line and open/outline shapes, the glow pass is drawn by increasing the rendered stroke width by 2 * outsetPx while keeping the base geometry centered. The opaque core is then drawn with the authored thickness on top.
- The file continues to own rounded-segment construction and polygon stroke logic. No glow-specific geometry duplication is allowed in GlyphTextureGen.
Interface / contract:

- Return boolean handled/not-handled exactly as today.
- New effective signature contract: drawStrokeGlyphShape(graphics, shape, thickness, color, outsetPx): boolean.
## src/engine/phaser/display/glyph/GlyphTextureGen.ts

Responsibility: Canonical glyph texture synthesis and glyph texture cache-key construction.

Logic:

- Keep normalizeThickness and the public generateGlyphTexture/generateGlyphTextures entrypoints.
- Build texture keys as glyphtex:<glow-version>:<shape>:<lowercased-color>:<normalized-thickness>. The version segment is mandatory.
- Generate the texture by clearing the scratch graphics, then drawing all baked glow passes in order, then drawing the opaque core pass.
- The same draw path must be used for both prewarmed textures and on-demand textures. generateGlyphTextures must therefore prewarm by calling generateGlyphTexture rather than drawing a different texture family directly.
- The generated texture always contains both glow and core. There is no separate glow texture key after this change.
- Filter mode remains LINEAR.
Interface / contract:

- Public signatures remain unchanged.
- For identical inputs, repeated calls must return the same key and must not regenerate the texture if it already exists.
- All callers of TextureManager.getGlyphTexture receive the baked-glow contract automatically.
## src/engine/phaser/display/modules/GlyphModule.ts

Responsibility: Allocate and own pooled image objects for standard node glyph rendering.

Logic:

- Replace the three-group allocation model with a single image array sized to GLYPH_POSITION_COORDS.length.
- Attach only those nine images to scratch.root and set scratch.mainImage to images[0].
- The module continues to delegate rendering to glyphModuleRuntime.
Interface / contract:

- createGlyphModule(glyphRegistry) remains unchanged.
- The runtime now owns exactly one pooled image per slot, not three.
## src/engine/phaser/display/modules/glyphModuleRuntime.ts

Responsibility: Compute standard glyph render instructions and synchronize one runtime image per slot.

Logic:

- Remove applyGlow, glow texture reads, additive blend usage, and the per-tick instruction Map allocation.
- Consume resolveGlyphPlacementRenderModel output as a dense instruction array keyed by slot index, which is already the array order guaranteed by that function.
- Request exactly one texture per used slot using instruction.color and instruction.thickness.
- Maintain slot-local last-applied render state so unchanged texture key, position, scale, rotation, alpha, blend mode, and visibility do not trigger redundant Phaser setter calls.
- Unused slots are hidden only when their previous state was visible. Visible slots always use BLEND_MODE_NORMAL and alpha 1.
Interface / contract:

- tickGlyphImages continues to accept DisplayTickContext and GlyphRegistry. The internal image container becomes Img[] rather than Img[][].
- Pulse semantics, line-thickness resolution, glyph-key resolution, and palette-color resolution remain unchanged.
## src/engine/phaser/display/modules/TransferGlyphModule.ts

Responsibility: Allocate and own pooled image objects for pretty-mode transfer glyph rendering.

Logic:

- Replace outerGlow/innerGlow/baseImages allocation with one image array sized to GLYPH_POSITION_COORDS.length.
- Only pretty mode allocates images, exactly as today. Legacy mode remains a no-op runtime.
- scratch.mainImage remains the first glyph image.
Interface / contract:

- createTransferGlyphModule(glyphRegistry) remains unchanged.
- Pretty mode now owns exactly one pooled image per slot.
## src/engine/phaser/display/modules/transferGlyphRuntime.ts

Responsibility: Compute transfer glyph render instructions and synchronize one tinted runtime image per slot.

Logic:

- Remove glow texture reads, applyGlow, additive blend usage, and the outer/inner/base layer split.
- Request one baked glyph texture per used slot. The requested texture color remains white. Runtime tint continues to apply render.glyphColor to the single image so both core and glow are tinted together.
- Maintain slot-local last-applied state exactly as in glyphModuleRuntime so repeated identical frames do not reissue redundant Phaser setter calls.
- All visibility, default line thickness, pretty-mode gating, and overlay-bounds behavior remain unchanged.
Interface / contract:

- tickTransferGlyph continues to accept DisplayTickContext and GlyphRegistry. The image arguments collapse from three arrays to one array.
- Transfer glyph color remains an image tint contract, not a texture-key contract.
# 7. Required tests

| Field | Definition |
| --- | --- |
| src/engine/phaser/display/glyph/GlyphRegistry.test.ts | Add a test that an idempotent syncEpoch call with the same seed, same presets object reference, and same effective thickness does not invalidate the cache and does not change returned GlyphConfig object identity. |
| src/engine/phaser/display/glyph/GlyphRegistry.advanced.test.ts | Add a test that changing the effective default line thickness invalidates the epoch even when the presets object reference is unchanged. |
| src/engine/phaser/display/glyph/glyphGlowMath.test.ts | Replace the glow-scale tests with tests that assert the exact pass count, exact outset ordering, exact alpha ordering, and total deterministic pass sum. |
| src/engine/phaser/display/glyph/GlyphTextureGen.test.ts | Add unit tests for cache-key versioning, lowercased color normalization, one-time generation for repeated identical inputs, and prewarm delegation through the same draw path used by on-demand generation. |
| src/engine/phaser/display/modules/GlyphModule.test.ts | Update the allocation contract from 27 images to 9 images, assert scratch.mainImage points to the first image, assert there is no additive blend usage, and assert destroy releases 9 images. |
| src/engine/phaser/display/modules/glyphModuleRuntime.test.ts | Preserve the existing default-line-thickness and zero-shared-pulse tests, and add a stateful no-op test proving that an identical second tick does not call texture/transform setters again. |
| src/engine/phaser/display/modules/TransferGlyphModule.test.ts | Update pretty-mode allocation and destroy expectations from 27 images to 9 images, and preserve the glyphColor tint and overlay-bounds assertions. |

# 8. Manual acceptance criteria

1. A standard node glyph uses one Phaser image per active slot. No separate glow images exist in the display list.
2. A pretty transfer glyph uses one Phaser image per active slot. No separate glow images exist in the display list.
3. The glow is visually radial and continuous. No directional stamp pattern is visible.
4. The glow does not clip against the texture bounds for any currently supported glyph shape at the authored default thickness.
5. Display export and progress bar icons use the same baked-glow appearance without code changes in those callers.
6. Pulse motion, slot ordering, palette color resolution, and default line-thickness behavior match the pre-change runtime semantics.
# 9. Implementation sequence

1. Implement the GlyphRegistry.syncEpoch fast path and its tests first. This is logically isolated and removes guaranteed frame-loop work immediately.
2. Implement the baked glow recipe constants and pure pass helper next.
3. Extend the core/stroke draw helpers to support outset-aware drawing.
4. Update GlyphTextureGen so prewarm and on-demand generation share the same baked-glow path.
5. Collapse GlyphModule to one image per slot and update glyphModuleRuntime to one-texture sync with stateful delta updates.
6. Collapse TransferGlyphModule and transferGlyphRuntime in the same way.
7. Run the full glyph-related unit test set, then perform a manual runtime check covering node glyphs, pretty transfer glyphs, progress bar icons, and display export.
# 10. Final contract

- There is exactly one runtime image per glyph slot in both node glyph rendering and pretty transfer glyph rendering.
- All glyph textures generated through the existing glyph texture generator use the same baked radial glow recipe.
- No separate runtime glow layer exists for glyphs after this change.
- The public API surface named in Section 2 remains unchanged.
- Tests and implementation must adhere to the project contract: no speculative refactors, no silent failures, behavior-first tests, and no architecture violations.

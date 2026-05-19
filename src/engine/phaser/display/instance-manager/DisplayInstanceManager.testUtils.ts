import type { DisplayInstanceManagerDeps } from "./DisplayInstanceManager.types";
import {
    createFakeContainer,
    createFakeImage,
    createFakeScene,
} from "../testFakes";

export const createFakeDeps = (
    entities: any[] = [],
): DisplayInstanceManagerDeps => {
    const scene = createFakeScene();
    const createdRoots: any[] = [];
    const layers = {
        get: () => createFakeContainer(),
        destroy() {},
    } as any;
    const pools = {
        get: () => ({
            rootPool: {
                acquire: () => {
                    const root = createFakeContainer();
                    createdRoots.push(root);
                    return root;
                },
                release() {},
            },
            backgroundAnchorPool: {
                acquire: () => createFakeContainer(),
                release() {},
            },
            effectsAnchorPool: {
                acquire: () => createFakeContainer(),
                release() {},
            },
            overlayAnchorPool: {
                acquire: () => createFakeContainer(),
                release() {},
            },
            imagePool: { acquire: () => createFakeImage(), release() {} },
        }),
        destroyAll() {},
    } as any;

    const runtime =
        entities.length > 0
            ? {
                  getEntities: () => entities,
                  getEntity: (id: string) =>
                      entities.find((entity) => entity.id === id) ?? null,
                  getCartridge: () => ({
                      blueprints: {
                          bp1: {
                              id: "bp1",
                              components: {
                                  display: { display_key: "k", label: "L" },
                              },
                          },
                      },
                      assets: {
                          displays: {
                              k: { type: "body" },
                              unknown: { type: "body" },
                          },
                          styles: {},
                      },
                  }),
                  getPhysicsBody: () => ({ x: 10, y: 20, radius: 5 }),
                  getState: () => ({
                      tick: 0,
                      seed: "test-seed",
                      status: "running",
                  }),
              }
            : null;

    const deps = {
        scene,
        layers,
        pools,
        displayRegistry: {
            resolve: () => ({ display_key: "k", moduleStack: [] }),
        } as any,
        textureManager: {
            get: (k: string) => k,
            getShapeTexture: () => "",
            getAvatarSilhouetteTexture: () => "avatar:silhouette:test",
            getAvatarGlowTexture: () => "avatar:glow:test",
            getAvatarEyesTexture: () => "avatar:eyes:test",
        } as any,
        pulseEngine: {
            getDemandPulse: () => 0.5,
            getSupplyPulse: () => 0.5,
        } as any,
        placeholderVariantRegistry: {
            get: () => ({ texture: "t", rotation: 0, flipX: false }),
        } as any,
        particlesConfigRegistry: {
            get: () => ({
                getConfig: () => ({}),
                mapIntensity: () => ({ enabled: false }),
            }),
        } as any,
        glyphRegistry: {
            syncEpoch: () => {},
            get: () => ({
                id: "k",
                placements: [],
                pulse: { delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
            }),
            clear: () => {},
        } as any,
        avatarRegistry: {
            syncEpoch: () => {},
            resolve: () => ({
                appearanceKey: "test",
                faceShapeIndex: 0,
                hairShapeIndex: 0,
                eyeShapeIndex: 0,
                eyeOffsetY: 0,
                eyeSpacing: 12,
                eyeScaleX: 1,
                eyeScaleY: 1,
                blinkIntervalMs: 3000,
                blinkDurationMs: 120,
                blinkPhaseMs: 0,
            }),
            clear: () => {},
        } as any,
        getRuntime: () => runtime as any,
        getSelectedEntityId: () => null,
        selectEntity: () => {},
    } as DisplayInstanceManagerDeps;
    return {
        ...deps,
        __createdRoots: createdRoots,
    } as DisplayInstanceManagerDeps & { __createdRoots: any[] };
};


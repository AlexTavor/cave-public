import { describe, expect, it } from "vitest";
import { BLEND_MODE_ADD } from "../../blendModes";
import {
    AVATAR_SWARM_AURA_ALPHA,
    AVATAR_SWARM_AURA_SCALE,
} from "../../avatar/AvatarDisplayConstants";
import { resolveLightState } from "./lightModuleState";

const makeTickCtx = (
    entity: Record<string, unknown>,
    radius = 30,
    display_key = "transfer",
    pulseEngine: Record<string, unknown> = {},
) =>
    ({
        entity,
        spec: { entityId: "entity-1", display_key, radius } as any,
        pulseValue: 0,
        timeMs: 0,
        deltaMs: 16,
        scene: {} as any,
        layers: {} as any,
        pools: {} as any,
        textureManager: {} as any,
        pulseEngine: pulseEngine as any,
        scratch: {} as any,
        selectedEntityId: null,
        selectEntity: () => {},
    }) as any;

describe("LightModule", () => {
    it("ignores deprecated pretty transfer light snapshots", () => {
        const state = resolveLightState(
            makeTickCtx({
                transfer: { payload: { wood: 9 } },
                render: {
                    mode: "pretty",
                    visualType: "wood",
                    baseRadius: 4,
                    glyphPresetKey: "wood",
                    glyphColor: "#fff",
                    light: {
                        shape: "hex",
                        color: "#ffaa00",
                        alpha: 0.4,
                        radiusFactor: 1.5,
                        blendMode: "ADD",
                    },
                    particles: {
                        shape: "circle",
                        color: "#fff",
                        speed: { min: 1, max: 2 },
                        lifespan: 1,
                        scale: { start: 1, end: 0 },
                        alpha: { start: 1, end: 0 },
                        frequency: 1,
                        quantity: 1,
                        blendMode: "NORMAL",
                    },
                },
            }),
        );
        expect(state).toBeNull();
    });

    it("scales cave glow from comfort instead of pulse", () => {
        const weak = resolveLightState(
            makeTickCtx(
                {
                    state: { comfort: { value: 0 } },
                    cave: { mind: { render: { eyeColor: "#112233" } } },
                },
                40,
                "cave_level",
            ),
        );
        const strong = resolveLightState(
            makeTickCtx(
                {
                    state: { comfort: { value: 1 } },
                    cave: { mind: { render: { eyeColor: "#112233" } } },
                },
                40,
                "cave_level",
            ),
        );
        expect(weak?.alpha).toBeCloseTo(0.08);
        expect(strong?.alpha).toBeGreaterThan(weak?.alpha ?? 0);
        expect(strong?.radius).toBeGreaterThan(weak?.radius ?? 0);
    });

    it.each([
        ["attr_body", "body"],
        ["attr_mind", "mind"],
        ["attr_social", "social"],
    ] as const)("uses pulse palette glow for %s", (displayKey, attribute) => {
        const palette = { body: "#111111", mind: "#222222", social: "#333333" };
        const state = resolveLightState(
            makeTickCtx({}, 30, displayKey, {
                getAllNodeColors: () => palette,
            }),
        );
        expect(state).toMatchObject({
            kind: "point",
            blendMode: BLEND_MODE_ADD,
            color: palette[attribute],
            alpha: AVATAR_SWARM_AURA_ALPHA,
            radius: 30 * AVATAR_SWARM_AURA_SCALE,
        });
    });
});

import { describe, expect, it } from "vitest";
import { MenuAmbientProximityLightModule } from "./MenuAmbientProximityLightModule";

describe("MenuAmbientProximityLightModule pointer refresh", () => {
    it("refreshes pointer world coordinates from the main camera before resolving", () => {
        const pointer = {
            worldX: 0,
            worldY: 0,
            updateWorldPoint() {
                pointer.worldX = 160;
                pointer.worldY = 20;
            },
        };
        const ctx = {
            scene: {
                cameras: { main: {} },
                input: { activePointer: pointer },
                lights: { active: true, addPointLight: () => light },
            },
            spec: { hasPhysics: true, radius: 24, x: 10, y: 20 },
        } as any;
        const light = {
            color: { setTo() {} },
            destroy() {},
            setBlendMode() {},
            setPosition() {},
            setVisible() {},
            intensity: 0,
            radius: 0,
        };
        MenuAmbientProximityLightModule.create(ctx).tick(ctx);
        expect(light.intensity).toBeGreaterThan(0);
    });
});
